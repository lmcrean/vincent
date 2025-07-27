import { ImageStyle } from '../types.js';

interface StyleTemplate {
  vocabulary: string;
  concept: string;
  default: string;
}

const STYLE_TEMPLATES: Record<ImageStyle, StyleTemplate> = {
  educational: {
    vocabulary: "Create a clear educational illustration for '{question}' showing '{answer}'. Style: clean, minimal text, suitable for memorization and learning.",
    concept: "Generate an educational diagram explaining: {question}. Key concept: {answer}. Style: clear labels, simple graphics, textbook quality.",
    default: "Create an educational illustration for this flashcard. Question: {question}. Answer: {answer}. Style: clean, informative, study-friendly."
  },
  medical: {
    vocabulary: "Create a detailed medical illustration showing {question}. Focus on {answer}. Style: anatomical accuracy, medical textbook quality, professional.",
    concept: "Generate a medical-style diagram for {question} demonstrating {answer}. Style: clinical precision, anatomical detail, healthcare professional quality.",
    default: "Create a medical illustration for {question} showing {answer}. Style: professional, clinical, anatomically accurate."
  },
  colorful: {
    vocabulary: "Create a vibrant, memorable illustration for {question} showing {answer}. Style: colorful, engaging, fun, easy to remember.",
    concept: "Generate a colorful, engaging visual for {question} demonstrating {answer}. Style: bright colors, memorable design, visually appealing.",
    default: "Create a colorful, memorable illustration for {question} and {answer}. Style: vibrant, engaging, fun, visually striking."
  }
};

export class PromptGenerator {
  constructor(private style: ImageStyle) {}

  generatePrompt(question: string, answer: string): string {
    const template = this.selectTemplate(question, answer);
    
    return template
      .replace(/\{question\}/g, this.cleanText(question))
      .replace(/\{answer\}/g, this.cleanText(answer));
  }

  private selectTemplate(question: string, answer: string): string {
    const templates = STYLE_TEMPLATES[this.style];
    
    // Simple heuristics to choose template type
    if (this.isVocabularyCard(question, answer)) {
      return templates.vocabulary;
    } else if (this.isConceptCard(question, answer)) {
      return templates.concept;
    } else {
      return templates.default;
    }
  }

  private isVocabularyCard(question: string, answer: string): boolean {
    const vocabPatterns = [
      /what is.*\?/i,
      /what does.*mean\?/i,
      /define.*\?/i,
      /definition.*\?/i,
      /meaning.*\?/i
    ];
    
    return vocabPatterns.some(pattern => pattern.test(question)) || 
           answer.length < 50; // Short answers likely definitions
  }

  private isConceptCard(question: string, answer: string): boolean {
    const conceptPatterns = [
      /how.*\?/i,
      /why.*\?/i,
      /explain.*\?/i,
      /describe.*\?/i,
      /process.*\?/i,
      /function.*\?/i
    ];
    
    return conceptPatterns.some(pattern => pattern.test(question)) ||
           answer.length > 100; // Longer answers likely explanations
  }

  private cleanText(text: string): string {
    return text
      .replace(/['"]/g, '') // Remove quotes that might interfere with prompt
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim()
      .substring(0, 200); // Limit length to keep prompts manageable
  }
}