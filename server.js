import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Use IPv4 address explicitly instead of localhost
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

// Get available models
app.get('/api/tags', async (request, response) => {
  try {
    console.log('Fetching available models from:', OLLAMA_BASE_URL);
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    
    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API returned ${ollamaResponse.status}`);
    }
    
    const data = await ollamaResponse.json();
    console.log('Models fetched successfully:', data.models?.length || 0);
    response.json(data);
  } catch (error) {
    console.error('Error fetching models:', error.message);
    response.status(500).json({ 
      error: 'Failed to fetch models from Ollama',
      details: error.message,
      tip: 'Make sure Ollama is running on port 11434'
    });
  }
});

// Book recommendation endpoint
app.post('/api/recommend', async (request, response) => {
  try {
    const { book, model = 'llama2' } = request.body;
    
    if (!book) {
      return response.status(400).json({ error: 'Book name is required' });
    }

    console.log('Getting recommendations for:', book);
    console.log('Using model:', model);

    // First, let's check if the model is available
    const modelsResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!modelsResponse.ok) {
      throw new Error('Cannot connect to Ollama. Make sure it is running.');
    }

    const modelsData = await modelsResponse.json();
    const availableModels = modelsData.models.map(m => m.name);
    
    if (!availableModels.includes(model)) {
      return response.status(400).json({
        error: `Model '${model}' not found. Available models: ${availableModels.join(', ')}`,
        availableModels
      });
    }

    const systemPrompt = `You are a knowledgeable book recommendation expert. 
When given a book title, provide 3 book recommendations that are similar in genre, theme, or style.
For each recommendation, include:
1. The book title and author
2. A brief explanation of why it's recommended
3. Similarities to the original book

Format your response clearly with each book as a separate section. Keep the response concise but informative.`;

    const userMessage = `Please recommend books similar to "${book}".`;

    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: false,
        options: {
          temperature: 0.7
        }
      }),
    });

    console.log('Ollama response status:', ollamaResponse.status);

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      throw new Error(`Ollama API error: ${ollamaResponse.status} - ${errorText}`);
    }

    const data = await ollamaResponse.json();
    console.log('Recommendations generated successfully');
    
    response.json({
      originalBook: book,
      recommendations: data.message?.content || 'No recommendations generated',
      model: data.model
    });
    
  } catch (error) {
    console.error('Error getting recommendations:', error);
    response.status(500).json({ 
      error: 'Failed to get recommendations',
      details: error.message,
      tip: 'Check if Ollama is running and the model is downloaded'
    });
  }
});

// Simple test endpoint
app.get('/api/test', async (request, response) => {
  try {
    console.log('Testing Ollama connection to:', OLLAMA_BASE_URL);
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    
    if (ollamaResponse.ok) {
      const data = await ollamaResponse.json();
      response.json({
        status: 'success',
        message: 'Ollama is running correctly!',
        ollamaUrl: OLLAMA_BASE_URL,
        availableModels: data.models?.map(m => m.name) || []
      });
    } else {
      response.status(500).json({
        status: 'error',
        message: 'Ollama is not responding correctly'
      });
    }
  } catch (error) {
    response.status(500).json({
      status: 'error',
      message: 'Cannot connect to Ollama',
      error: error.message,
      ollamaUrl: OLLAMA_BASE_URL
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Ollama URL: ${OLLAMA_BASE_URL}`);
  console.log('Test Ollama connection at: http://localhost:3000/api/test');
  console.log('Get models at: http://localhost:3000/api/tags');
});