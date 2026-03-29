import sys
import json
import cv2
import numpy as np
from ultralytics import YOLO, RTDETR
from ensemble_boxes import weighted_boxes_fusion

CONF_THRES = 0.35
IOU_THR_WBF = 0.60
MODEL_WEIGHTS = [3, 1]   # YOLO, RT-DETR


CLASS_NAMES = {
    0: "tasit",
    1: "insan"
}

DISPLAY_NAMES = {
    "tasit": "Taşıt",
    "insan": "İnsan"
}


def get_model_class_name(model, cls_id):
    if isinstance(model.names, dict):
        return str(model.names.get(int(cls_id), str(cls_id))).lower().strip()
    return str(model.names[int(cls_id)]).lower().strip()


def normalize_class_name(class_name):
    human_names = {
        "person", "human", "insan", "kisi", "kişi", "pedestrian"
    }

    vehicle_names = {
        "car", "vehicle", "truck", "bus", "motorcycle", "bicycle",
        "arac", "araç", "taşıt", "tasit", "otomobil",
        "kamyon", "otobus", "otobüs", "motosiklet", "van"
    }

    if class_name in vehicle_names:
        return 0   # tasit
    if class_name in human_names:
        return 1   # insan

    return None


def predict_single_model(model, image_bgr, conf=0.35, device="cpu"):
    h, w = image_bgr.shape[:2]

    results = model.predict(
        source=image_bgr,
        conf=conf,
        device=device,
        verbose=False
    )

    result = results[0]

    boxes = []
    scores = []
    labels = []

    if result.boxes is None or len(result.boxes) == 0:
        return boxes, scores, labels, w, h

    xyxy = result.boxes.xyxy.cpu().numpy()
    confs = result.boxes.conf.cpu().numpy()
    clss = result.boxes.cls.cpu().numpy().astype(int)

    for box, score, cls_id in zip(xyxy, confs, clss):
        class_name = get_model_class_name(model, cls_id)
        normalized_label = normalize_class_name(class_name)

        if normalized_label is None:
            continue

        x1, y1, x2, y2 = box

        x1_n = max(0.0, min(1.0, float(x1) / w))
        y1_n = max(0.0, min(1.0, float(y1) / h))
        x2_n = max(0.0, min(1.0, float(x2) / w))
        y2_n = max(0.0, min(1.0, float(y2) / h))

        if x2_n > x1_n and y2_n > y1_n:
            boxes.append([x1_n, y1_n, x2_n, y2_n])
            scores.append(float(score))
            labels.append(int(normalized_label))

    return boxes, scores, labels, w, h


def safe_predict(model, image_bgr, conf):
    try:
        import torch
        device = 0 if torch.cuda.is_available() else "cpu"
    except Exception:
        device = "cpu"

    try:
        return predict_single_model(model, image_bgr, conf=conf, device=device)
    except Exception:
        return predict_single_model(model, image_bgr, conf=conf, device="cpu")


def main():
    if len(sys.argv) != 4:
        print(json.dumps({
            "error": True,
            "message": "Kullanım: python ensemble_detect.py <yolo_model> <rtdetr_model> <image_path>"
        }, ensure_ascii=False))
        sys.exit(1)

    yolo_model_path = sys.argv[1]
    rtdetr_model_path = sys.argv[2]
    image_path = sys.argv[3]

    image = cv2.imread(image_path)
    if image is None:
        print(json.dumps({
            "error": True,
            "message": f"Görüntü okunamadı: {image_path}"
        }, ensure_ascii=False))
        sys.exit(1)

    try:
        yolo_model = YOLO(yolo_model_path)
        rtdetr_model = RTDETR(rtdetr_model_path)

        boxes1, scores1, labels1, w, h = safe_predict(yolo_model, image, CONF_THRES)
        boxes2, scores2, labels2, _, _ = safe_predict(rtdetr_model, image, CONF_THRES)

        if len(boxes1) == 0 and len(boxes2) == 0:
            print(json.dumps({
                "detections": [],
                "summary": {
                    "humanCount": 0,
                    "vehicleCount": 0,
                    "total": 0
                }
            }, ensure_ascii=False))
            sys.exit(0)

        fused_boxes, fused_scores, fused_labels = weighted_boxes_fusion(
            [boxes1, boxes2],
            [scores1, scores2],
            [labels1, labels2],
            weights=MODEL_WEIGHTS,
            iou_thr=IOU_THR_WBF,
            skip_box_thr=CONF_THRES
        )

        detections = []

        for i, (box, score, cls_id) in enumerate(zip(fused_boxes, fused_scores, fused_labels)):
            cls_id = int(cls_id)

            raw_class = CLASS_NAMES.get(cls_id, str(cls_id))
            display_class = DISPLAY_NAMES.get(raw_class, raw_class)

            x1 = float(box[0]) * w
            y1 = float(box[1]) * h
            x2 = float(box[2]) * w
            y2 = float(box[3]) * h

            width = max(0.0, x2 - x1)
            height = max(0.0, y2 - y1)

            detections.append({
                "id": f"det-{i}",
                "type": display_class,
                "confidence": round(float(score), 4),
                "timestamp": 0,
                "x": round((x1 / w) * 100.0, 4),
                "y": round((y1 / h) * 100.0, 4),
                "width": round((width / w) * 100.0, 4),
                "height": round((height / h) * 100.0, 4),
                "rawClass": raw_class
            })

        human_count = sum(1 for d in detections if d["rawClass"] == "insan")
        vehicle_count = sum(1 for d in detections if d["rawClass"] == "tasit")

        result = {
            "detections": detections,
            "summary": {
                "humanCount": human_count,
                "vehicleCount": vehicle_count,
                "total": len(detections)
            }
        }

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({
            "error": True,
            "message": str(e)
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()