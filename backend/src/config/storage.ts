import path from 'path';
import fs from 'fs';

const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../../prod_s3');

export const FOLDERS = {
  documents: path.join(STORAGE_PATH, 'documents'),
  images: path.join(STORAGE_PATH, 'images'),
  audio: path.join(STORAGE_PATH, 'audio'),
  videos: path.join(STORAGE_PATH, 'videos'),
};

export const initStorage = (): void => {
  Object.values(FOLDERS).forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
  });
};
