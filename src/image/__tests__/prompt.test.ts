import { describe, it, expect } from 'vitest';
import { PromptGenerator } from '../prompt.js';

describe('PromptGenerator', () => {
  describe('constructor', () => {
    it('should create generator with educational style', () => {
      const generator = new PromptGenerator('educational');
      expect(generator).toBeInstanceOf(PromptGenerator);
    });

    it('should create generator with medical style', () => {
      const generator = new PromptGenerator('medical');
      expect(generator).toBeInstanceOf(PromptGenerator);
    });

    it('should create generator with colorful style', () => {
      const generator = new PromptGenerator('colorful');
      expect(generator).toBeInstanceOf(PromptGenerator);
    });
  });

  describe('generatePrompt', () => {
    describe('educational style', () => {
      const generator = new PromptGenerator('educational');

      it('should generate vocabulary prompt for definition questions', () => {
        const prompt = generator.generatePrompt(
          'What is photosynthesis?',
          'The process by which plants convert light into energy'
        );

        expect(prompt).toContain('clear educational illustration');
        expect(prompt).toContain('What is photosynthesis');
        expect(prompt).toContain('The process by which plants convert light into energy');
        expect(prompt).toContain('clean, minimal text, suitable for memorization');
      });

      it('should generate concept prompt for explanation questions', () => {
        const prompt = generator.generatePrompt(
          'How does photosynthesis work?',
          'Photosynthesis is a complex process where plants use chlorophyll to absorb sunlight, convert carbon dioxide and water into glucose and oxygen through a series of chemical reactions in the chloroplasts.'
        );

        expect(prompt).toContain('educational diagram explaining');
        expect(prompt).toContain('How does photosynthesis work');
        expect(prompt).toContain('clear labels, simple graphics');
      });

      it('should generate default prompt for general questions', () => {
        const prompt = generator.generatePrompt(
          'Biology question',
          'Biology answer'
        );

        expect(prompt).toContain('educational illustration for this flashcard');
        expect(prompt).toContain('Biology question');
        expect(prompt).toContain('Biology answer');
        expect(prompt).toContain('clean, informative, study-friendly');
      });
    });

    describe('medical style', () => {
      const generator = new PromptGenerator('medical');

      it('should generate medical vocabulary prompt', () => {
        const prompt = generator.generatePrompt(
          'What is the heart?',
          'A muscular organ that pumps blood'
        );

        expect(prompt).toContain('detailed medical illustration');
        expect(prompt).toContain('What is the heart');
        expect(prompt).toContain('A muscular organ that pumps blood');
        expect(prompt).toContain('anatomical accuracy, medical textbook');
      });

      it('should generate medical concept prompt', () => {
        const prompt = generator.generatePrompt(
          'How does the heart pump blood?',
          'The heart pumps blood through a complex cycle of contractions and relaxations of the cardiac muscle, controlled by electrical impulses from the sinoatrial node.'
        );

        expect(prompt).toContain('medical-style diagram');
        expect(prompt).toContain('How does the heart pump blood');
        expect(prompt).toContain('clinical precision, anatomical detail');
      });

      it('should generate medical default prompt', () => {
        const prompt = generator.generatePrompt(
          'Medical term',
          'Medical definition'
        );

        expect(prompt).toContain('medical illustration');
        expect(prompt).toContain('Medical term');
        expect(prompt).toContain('Medical definition');
        expect(prompt).toContain('professional, clinical, anatomically accurate');
      });
    });

    describe('colorful style', () => {
      const generator = new PromptGenerator('colorful');

      it('should generate colorful vocabulary prompt', () => {
        const prompt = generator.generatePrompt(
          'What is a rainbow?',
          'A spectrum of light'
        );

        expect(prompt).toContain('vibrant, memorable illustration');
        expect(prompt).toContain('What is a rainbow');
        expect(prompt).toContain('A spectrum of light');
        expect(prompt).toContain('colorful, engaging, fun, easy to remember');
      });

      it('should generate colorful concept prompt', () => {
        const prompt = generator.generatePrompt(
          'How are rainbows formed?',
          'Rainbows are formed when sunlight is refracted, reflected, and dispersed through water droplets in the atmosphere, creating a beautiful arc of colors in the sky.'
        );

        expect(prompt).toContain('colorful, engaging visual');
        expect(prompt).toContain('How are rainbows formed');
        expect(prompt).toContain('bright colors, memorable design');
      });

      it('should generate colorful default prompt', () => {
        const prompt = generator.generatePrompt(
          'Fun question',
          'Fun answer'
        );

        expect(prompt).toContain('colorful, memorable illustration');
        expect(prompt).toContain('Fun question');
        expect(prompt).toContain('Fun answer');
        expect(prompt).toContain('vibrant, engaging, fun, visually striking');
      });
    });
  });

  describe('template selection logic', () => {
    const generator = new PromptGenerator('educational');

    describe('vocabulary card detection', () => {
      it('should detect "what is" questions', () => {
        const prompt = generator.generatePrompt('What is DNA?', 'Genetic material');
        expect(prompt).toContain('clear educational illustration');
      });

      it('should detect "what does mean" questions', () => {
        const prompt = generator.generatePrompt('What does mitosis mean?', 'Cell division');
        expect(prompt).toContain('clear educational illustration');
      });

      it('should detect "define" questions', () => {
        const prompt = generator.generatePrompt('Define photosynthesis?', 'Light conversion');
        expect(prompt).toContain('clear educational illustration');
      });

      it('should detect short answers as vocabulary', () => {
        const prompt = generator.generatePrompt('Biology term', 'Short definition');
        expect(prompt).toContain('clear educational illustration');
      });

      it('should be case insensitive', () => {
        const prompt = generator.generatePrompt('WHAT IS ATP?', 'Energy molecule');
        expect(prompt).toContain('clear educational illustration');
      });
    });

    describe('concept card detection', () => {
      it('should detect "how" questions', () => {
        const prompt = generator.generatePrompt(
          'How does DNA replication work?',
          'DNA replication is a complex process involving multiple enzymes and steps to create identical copies of genetic material.'
        );
        expect(prompt).toContain('educational diagram explaining');
      });

      it('should detect "why" questions', () => {
        const prompt = generator.generatePrompt(
          'Why do cells divide?',
          'Cells divide for growth, repair, and reproduction purposes through carefully regulated processes.'
        );
        expect(prompt).toContain('educational diagram explaining');
      });

      it('should detect "explain" questions', () => {
        const prompt = generator.generatePrompt(
          'Explain cellular respiration?',
          'Cellular respiration is the metabolic process by which cells break down glucose to produce ATP energy.'
        );
        expect(prompt).toContain('educational diagram explaining');
      });

      it('should detect long answers as concepts', () => {
        const longAnswer = 'This is a very long answer that explains a complex concept in detail with multiple sentences and various aspects of the topic being covered comprehensively to help with understanding.';
        const prompt = generator.generatePrompt('Question', longAnswer);
        expect(prompt).toContain('educational diagram explaining');
      });
    });

    describe('default template fallback', () => {
      it('should use default template for unclear card types', () => {
        const prompt = generator.generatePrompt(
          'Random question format',
          'Medium length answer that doesn\'t fit clear patterns'
        );
        expect(prompt).toContain('educational illustration for this flashcard');
      });
    });
  });

  describe('text cleaning', () => {
    const generator = new PromptGenerator('educational');

    it('should remove quotes from text', () => {
      const prompt = generator.generatePrompt(
        'What is "photosynthesis"?',
        'The process of \'light conversion\''
      );

      expect(prompt).not.toContain('"');
      expect(prompt).not.toContain("'");
      expect(prompt).toContain('What is photosynthesis');
      expect(prompt).toContain('The process of light conversion');
    });

    it('should normalize whitespace', () => {
      const prompt = generator.generatePrompt(
        'What   is\t\tphotosynthesis?',
        'The  process\n\nof   light conversion'
      );

      expect(prompt).toContain('What is photosynthesis');
      expect(prompt).toContain('The process of light conversion');
    });

    it('should trim text', () => {
      const prompt = generator.generatePrompt(
        '  What is photosynthesis?  ',
        '  The process of light conversion  '
      );

      expect(prompt).toContain('What is photosynthesis');
      expect(prompt).toContain('The process of light conversion');
    });

    it('should limit text length', () => {
      const longText = 'A'.repeat(300);
      const prompt = generator.generatePrompt(longText, longText);

      const questionMatch = prompt.match(/A+/g);
      const answerMatch = prompt.match(/A+/g);
      
      expect(questionMatch).toBeTruthy();
      expect(answerMatch).toBeTruthy();
      
      // Each occurrence should be limited to 200 characters
      questionMatch!.forEach(match => {
        expect(match.length).toBeLessThanOrEqual(200);
      });
    });

    it('should handle empty strings', () => {
      const prompt = generator.generatePrompt('', '');

      expect(prompt).toContain('educational illustration for this flashcard');
      expect(prompt).not.toContain('{question}');
      expect(prompt).not.toContain('{answer}');
    });

    it('should handle special characters', () => {
      const prompt = generator.generatePrompt(
        'What is H₂O?',
        'Water molecule with 2 hydrogen & 1 oxygen atoms'
      );

      expect(prompt).toContain('What is H₂O');
      expect(prompt).toContain('Water molecule with 2 hydrogen & 1 oxygen atoms');
    });
  });

  describe('prompt template replacement', () => {
    const generator = new PromptGenerator('educational');

    it('should replace all occurrences of placeholders', () => {
      const prompt = generator.generatePrompt(
        'question text',
        'answer text'
      );

      expect(prompt).not.toContain('{question}');
      expect(prompt).not.toContain('{answer}');
      expect(prompt).toContain('question text');
      expect(prompt).toContain('answer text');
    });

    it('should handle placeholders in text content', () => {
      const prompt = generator.generatePrompt(
        'What is {variable}?',
        'A placeholder called {value}'
      );

      // Should replace template placeholders but preserve content placeholders
      expect(prompt).toContain('What is {variable}');
      expect(prompt).toContain('A placeholder called {value}');
    });
  });

  describe('edge cases', () => {
    const generator = new PromptGenerator('educational');

    it('should handle very short questions and answers', () => {
      const prompt = generator.generatePrompt('?', 'A');

      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should handle questions without question marks', () => {
      const prompt = generator.generatePrompt('Define photosynthesis', 'Light conversion');

      expect(prompt).toContain('clear educational illustration');
    });

    it('should handle answers with question-like patterns', () => {
      const prompt = generator.generatePrompt(
        'Question',
        'Why is this important? How does it work? What happens next?'
      );

      expect(prompt).toBeTruthy();
    });

    it('should handle unicode characters', () => {
      const prompt = generator.generatePrompt(
        '什么是光合作用？',
        'Photosynthèse en français'
      );

      expect(prompt).toContain('什么是光合作用');
      expect(prompt).toContain('Photosynthèse en français');
    });
  });
});