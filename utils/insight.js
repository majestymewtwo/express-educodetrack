const { OpenAI } = require("openai");

require('dotenv').config();

const HUGGING_FACE_API_KEY = process.env.HF_API_KEY;


const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: HUGGING_FACE_API_KEY,
});

async function analyzeCodingPlatformDataFaculty(userData) {
  try {
    const prompt = `Analyze this Coding Platform user data and provide detailed insights:

    ${JSON.stringify(userData, null, 2)}

    Please provide:
    1. Overall assessment of coding proficiency
    2. Strengths based on problem-solving patterns
    3. Areas that need improvement
    4. Recommended next steps and topics to focus on
    5. Comparison to typical users at this level
    
    
    Your answer must not be in markdown, it must be plaintext string. `;

    const chatCompletion = await client.chat.completions.create({
      model: "meta-llama/Llama-3.1-8B-Instruct:nebius",
      messages: [
        {
          role: "system",
          content:
            "You are an expert coding mentor analyzing LeetCode performance data. Provide actionable and specific insights.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

async function analyzeCodingPlatformDataStudent(userData) {
  try {
    const prompt = `Analyze this Coding Platform user data and provide 
    encouraging, supportive, and confidence-boosting insights for the student:
    
    ${JSON.stringify(userData, null, 2)}
    
    Please ensure the overall tone is happy, positive, uplifting, and motivating. 
    The goal is to celebrate progress, highlight potential, and inspire continued learning, 
    even when discussing areas for improvement.
    
    Please provide:
    1. A positive overall assessment of coding proficiency, emphasizing growth and potential
    2. Key strengths based on problem-solving patterns, with encouraging language
    3. Areas for improvement framed constructively and optimistically
    4. Recommended next steps and topics to focus on, presented as exciting opportunities to grow
    5. A comparison to typical users at this level that reassures and motivates the student
    
    Your answer must be a plaintext string (not markdown) and should leave the student feeling 
    confident, proud, and excited to continue learning.`;


    const chatCompletion = await client.chat.completions.create({
      model: "meta-llama/Llama-3.1-8B-Instruct:nebius",
      messages: [
        {
          role: "system",
          content:
            "You are an expert coding mentor analyzing LeetCode performance data. Provide actionable and specific insights.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

module.exports = {
  analyzeCodingPlatformDataFaculty,
  analyzeCodingPlatformDataStudent
};
