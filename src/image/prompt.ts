import { ImageStyle } from '../types.js';

interface StyleTemplate {
  vocabulary: string;
  concept: string;
  default: string;
}

const STYLE_TEMPLATES: Record<ImageStyle, StyleTemplate> = {
  educational: {
    vocabulary: "Create a simple visual symbol representing '{question}' and '{answer}'. NO TEXT, NO LABELS, NO WRITING. Pure visual icon only. Style: clean, symbolic, recognizable.",
    concept: "Generate a simple visual icon for {question} representing {answer}. NO TEXT, NO LABELS, NO WRITING. Style: symbolic representation, visual metaphor only.",
    default: "Create a visual symbol for this concept. Question: {question}. Answer: {answer}. NO TEXT, NO LABELS, NO WRITING. Pure icon only."
  },
  medical: {
    vocabulary: "Create an anatomical symbol showing {question} representing {answer}. NO TEXT, NO LABELS, NO WRITING. Style: anatomical shape, medical symbol only.",
    concept: "Generate a medical-style visual symbol for {question} showing {answer}. NO TEXT, NO LABELS, NO WRITING. Style: anatomical icon, medical symbol.",
    default: "Create a medical symbol for {question} representing {answer}. NO TEXT, NO LABELS, NO WRITING. Anatomical icon only."
  },
  colorful: {
    vocabulary: "Create a bright, colorful symbol for {question} representing {answer}. NO TEXT, NO LABELS, NO WRITING. Style: vibrant icon, memorable visual symbol.",
    concept: "Generate a colorful visual symbol for {question} showing {answer}. NO TEXT, NO LABELS, NO WRITING. Style: bright colors, symbolic representation.",
    default: "Create a colorful symbol for {question} and {answer}. NO TEXT, NO LABELS, NO WRITING. Vibrant icon only."
  },
  minimal: {
    vocabulary: "Create a simple geometric icon representing {question} and {answer}. NO TEXT, NO LABELS, NO WRITING. Style: minimal shapes, essential visual elements only.",
    concept: "Generate a minimalist symbol for {question} showing {answer}. NO TEXT, NO LABELS, NO WRITING. Style: geometric shapes, pure visual abstraction.",
    default: "Create a minimalist icon for {question} and {answer}. NO TEXT, NO LABELS, NO WRITING. Simple geometric symbol only."
  },
  iconic: {
    vocabulary: "Create a universally recognizable icon for '{question}' representing '{answer}'. NO TEXT, NO LABELS, NO WRITING. Style: simple symbol, instantly recognizable.",
    concept: "Generate a symbolic icon for {question} representing {answer}. NO TEXT, NO LABELS, NO WRITING. Style: universal symbol, visual metaphor.",
    default: "Create a pure icon representing {question} and {answer}. NO TEXT, NO LABELS, NO WRITING. Universal symbol only."
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