// Whisper API Controller for Speech-to-Text
const FormData = require('form-data');
const axios = require('axios');

// @desc    Transcribe audio using OpenAI Whisper API
// @route   POST /api/whisper/transcribe
// @access  Private
const transcribeAudio = async (req, res) => {
  try {
    console.log('Whisper transcription request received');
    console.log('File:', req.file ? `Present (${req.file.size} bytes, ${req.file.mimetype})` : 'Missing');
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        success: false,
        message: 'No audio file provided',
        data: null
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.',
        data: null
      });
    }

    // Create FormData for OpenAI API
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'audio.webm',
      contentType: req.file.mimetype || 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    // Call OpenAI Whisper API
    let response;
    try {
      response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders()
        }
      });
    } catch (error) {
      if (error.response) {
        const errorData = error.response.data;
        return res.status(error.response.status).json({
          success: false,
          message: errorData.error?.message || `OpenAI API error: ${error.response.status}`,
          data: null
        });
      }
      throw error;
    }

    const data = response.data;

    res.json({
      success: true,
      message: 'Audio transcribed successfully',
      data: {
        text: data.text
      }
    });

  } catch (error) {
    console.error('Whisper transcription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transcribe audio: ' + error.message,
      data: null
    });
  }
};

module.exports = {
  transcribeAudio
};

