import { Response } from 'express';
import path from 'path';
import GenerationRequestModel from '../models/generationRequest';
import { AuthRequest } from '../middleware/auth';
import { simplifyMedicalContent } from '../services/medicalSimplifier';
import { extractTextFromDocument, joinPagesForLLM } from '../services/documentExtractor';

const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../../prod_s3');

const processAndRespond = async (requestId: number, textToSimplify: string, res: Response, statusCode = 201) => {
  const result = await simplifyMedicalContent(textToSimplify);
  if (result.success && result.simplifiedText) {
    await GenerationRequestModel.updateSimplifiedText(requestId, result.simplifiedText);
    await GenerationRequestModel.updateVideoPath(requestId, 'video.mp4');
    const fullRequest = await GenerationRequestModel.findByIdWithDetails(requestId);
    res.status(statusCode).json({ success: true, data: fullRequest });
  } else {
    await GenerationRequestModel.updateStatus(requestId, 'failed', result.error);
    const fullRequest = await GenerationRequestModel.findByIdWithDetails(requestId);
    res.status(500).json({ success: false, error: result.error, data: fullRequest });
  }
};

const generationController = {
  async createRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { inputType, originalText, avatarId, voiceId, llmProvider, ttsProvider, videoProvider } = req.body;
      const userId = req.userId!;

      let inputDocumentPath: string | undefined;
      if (req.file) {
        inputDocumentPath = path.join('documents', req.file.filename);
      }

      // Create the request
      const request = await GenerationRequestModel.create({
        userId,
        inputType: inputType || (req.file ? 'document' : 'text'),
        originalText,
        inputDocumentPath,
        avatarId: avatarId ? parseInt(avatarId) : undefined,
        voiceId: voiceId ? parseInt(voiceId) : undefined,
        llmProvider,
        ttsProvider,
        videoProvider,
      });

      // Text flow
      if (originalText && inputType === 'text') {
        await GenerationRequestModel.updateStatus(request.id, 'processing');
        await processAndRespond(request.id, originalText, res);
        return;
      }

      // Document flow
      if (req.file && inputType === 'document') {
        await GenerationRequestModel.updateStatus(request.id, 'processing');
        const filePath = path.join(STORAGE_PATH, 'documents', req.file.filename);
        const extraction = await extractTextFromDocument(filePath);

        if (!extraction.success || !extraction.extracted) {
          await GenerationRequestModel.updateStatus(request.id, 'failed', extraction.error);
          const fullRequest = await GenerationRequestModel.findByIdWithDetails(request.id);
          res.status(500).json({ success: false, error: extraction.error, data: fullRequest });
          return;
        }

        await GenerationRequestModel.updateExtractedText(request.id, JSON.stringify(extraction.extracted));
        const textForLLM = joinPagesForLLM(extraction.extracted);
        await processAndRespond(request.id, textForLLM, res);
        return;
      }

      const fullRequest = await GenerationRequestModel.findByIdWithDetails(request.id);
      res.status(201).json({ success: true, data: fullRequest });
    } catch (error) {
      console.error('Error creating request:', error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const request = await GenerationRequestModel.findByRequestIdWithDetails(id);

      if (!request) {
        res.status(404).json({ success: false, error: 'Request not found' });
        return;
      }

      if (request.user_id !== req.userId) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      res.json({ success: true, data: request });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async getMyRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const requests = await GenerationRequestModel.findByUserIdWithDetails(req.userId!);
      res.json({ success: true, data: requests });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  async updateRequestStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, errorMessage } = req.body;
      const request = await GenerationRequestModel.updateStatus(parseInt(id), status, errorMessage);
      res.json({ success: true, data: request });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};

export default generationController;
