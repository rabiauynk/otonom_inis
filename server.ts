/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import { spawn } from 'child_process';
import fs from 'fs';

const PORT = 3000;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    },
  });

  const upload = multer({ storage });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/detect', upload.single('image'), (req: Request, res: Response) => {
    console.log('>>> /api/detect çağrıldı');

    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      console.log('>>> Görüntü gelmedi');
      return res.status(400).json({ error: 'Görüntü yok' });
    }

    const imagePath = path.resolve(file.path);

    // =========================
    // İKİ MODEL PATH
    // =========================
    const yoloModelPath = path.resolve('yolo/best.pt');
    const rtdetrModelPath = path.resolve('best.pt');

    // Python script
    const scriptPath = path.resolve('yolo/detect.py');

    // Python exe
    const pythonExecutable = 'C:\\Users\\casper\\anaconda3\\envs\\tf_env\\python.exe';

    console.log('>>> Python:', pythonExecutable);
    console.log('>>> Script:', scriptPath);
    console.log('>>> YOLO Model:', yoloModelPath);
    console.log('>>> RT-DETR Model:', rtdetrModelPath);
    console.log('>>> Image:', imagePath);

    if (!fs.existsSync(yoloModelPath)) {
      fs.unlink(imagePath, () => {});
      return res.status(500).json({ error: 'YOLO model bulunamadı', path: yoloModelPath });
    }

    if (!fs.existsSync(rtdetrModelPath)) {
      fs.unlink(imagePath, () => {});
      return res.status(500).json({ error: 'RT-DETR model bulunamadı', path: rtdetrModelPath });
    }

    if (!fs.existsSync(scriptPath)) {
      fs.unlink(imagePath, () => {});
      return res.status(500).json({ error: 'Python script bulunamadı', path: scriptPath });
    }

    const py = spawn(
      pythonExecutable,
      [scriptPath, yoloModelPath, rtdetrModelPath, imagePath],
      { shell: false }
    );

    let resultData = '';
    let errorData = '';

    py.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    py.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    py.on('close', (code) => {
      console.log('>>> Python çıkış kodu:', code);
      console.log('>>> Python stdout:', resultData);
      console.log('>>> Python stderr:', errorData);

      fs.unlink(imagePath, () => {});

      if (code !== 0) {
        return res.status(500).json({
          error: 'Ensemble detect hata',
          details: errorData || resultData,
        });
      }

      try {
        const lines = resultData
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);

        const lastLine = lines[lines.length - 1];
        const parsed = JSON.parse(lastLine);

        return res.json(parsed);
      } catch (err) {
        return res.status(500).json({
          error: 'JSON parse hatası',
          raw: resultData,
          stderr: errorData,
        });
      }
    });

    py.on('error', (err) => {
      console.error('>>> Python process başlatılamadı:', err);

      fs.unlink(imagePath, () => {});

      return res.status(500).json({
        error: 'Python process başlatılamadı',
        details: String(err),
      });
    });
  });

  io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server: http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);