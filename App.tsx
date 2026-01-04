
import React, { useState, useEffect, useCallback } from 'react';
import { Book, GenerationStep, PageData } from './types';
import { generateStoryStructure, generateImage } from './services/geminiService';
import PageCard from './components/PageCard';

const App: React.FC = () => {
  const [theme, setTheme] = useState('');
  const [book, setBook] = useState<Book | null>(null);
  const [step, setStep] = useState<GenerationStep>(GenerationStep.IDLE);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) return;

    setError(null);
    setStep(GenerationStep.GENERATING_STORY);
    setBook(null);
    setProgress(0);

    try {
      // Step 1: Generate the narrative and page prompts
      const storyData = await generateStoryStructure(theme);
      
      const newBook: Book = {
        title: storyData.title,
        theme: theme,
        pages: storyData.pages.map(p => ({ ...p, isGeneratingImage: true })),
        createdAt: Date.now()
      };
      setBook(newBook);
      setStep(GenerationStep.GENERATING_IMAGES);

      // Step 2: Generate images for each page sequentially to show progress
      const updatedPages = [...newBook.pages];
      for (let i = 0; i < updatedPages.length; i++) {
        try {
          const imageUrl = await generateImage(updatedPages[i].imagePrompt);
          updatedPages[i] = {
            ...updatedPages[i],
            imageUrl,
            isGeneratingImage: false
          };
          setBook(prev => prev ? { ...prev, pages: [...updatedPages] } : null);
          setProgress(((i + 1) / updatedPages.length) * 100);
        } catch (imgErr) {
          console.error(`Failed to generate image for page ${i + 1}`, imgErr);
          updatedPages[i] = {
            ...updatedPages[i],
            isGeneratingImage: false
          };
          setBook(prev => prev ? { ...prev, pages: [...updatedPages] } : null);
        }
      }

      setStep(GenerationStep.COMPLETED);
    } catch (err) {
      console.error(err);
      setError("The magic book is currently sleeping. Please try another theme!");
      setStep(GenerationStep.ERROR);
    }
  };

  const updatePageImage = (pageId: string, newUrl: string) => {
    setBook(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(p => p.id === pageId ? { ...p, imageUrl: newUrl } : p)
      };
    });
  };

  const handleShare = async () => {
    if (!book) return;
    const shareText = `Read my AI book: ${book.title}`;
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        const shareData: any = { 
          title: book.title, 
          text: shareText 
        };
        
        // navigator.share requires a valid absolute URL. 
        // In some sandboxed or preview environments, location.href might be invalid.
        if (url && url.startsWith('http')) {
          shareData.url = url;
        }

        await navigator.share(shareData);
      } catch (err) {
        // AbortError is thrown when the user cancels the share dialog, which is fine.
        if ((err as Error).name !== 'AbortError') {
          console.error("Share operation failed:", err);
          // Fallback to clipboard on unexpected share failure
          copyToClipboard(shareText, url);
        }
      }
    } else {
      copyToClipboard(shareText, url);
    }
  };

  const copyToClipboard = async (text: string, url: string) => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      alert("Story link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500 p-2 rounded-xl shadow-lg">
              <i className="fas fa-book-open text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-sky-900 tracking-tight">DreamWeaver</h1>
          </div>

          <form onSubmit={startMagic} className="flex-1 max-w-xl w-full flex gap-2">
            <input 
              type="text" 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="What should our story be about?"
              disabled={step !== GenerationStep.IDLE && step !== GenerationStep.COMPLETED && step !== GenerationStep.ERROR}
              className="flex-1 bg-sky-50 border-2 border-sky-100 rounded-2xl px-4 py-2 outline-none focus:border-sky-400 transition-all text-sky-900 font-medium placeholder:text-sky-300"
            />
            <button 
              type="submit"
              disabled={step === GenerationStep.GENERATING_STORY || step === GenerationStep.GENERATING_IMAGES || !theme.trim()}
              className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white px-6 py-2 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
            >
              {step === GenerationStep.GENERATING_STORY || step === GenerationStep.GENERATING_IMAGES ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-wand-sparkles"></i>
              )}
              {book ? 'New Story' : 'Create Magic'}
            </button>
          </form>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8">
        {/* Loading / Status Section */}
        {step !== GenerationStep.IDLE && step !== GenerationStep.COMPLETED && (
          <div className="max-w-2xl mx-auto mb-12 bg-white rounded-3xl p-8 shadow-xl text-center">
            <h2 className="text-2xl font-bold text-sky-900 mb-2">
              {step === GenerationStep.GENERATING_STORY ? "Writing the adventure..." : "Painting the pictures..."}
            </h2>
            <p className="text-sky-600 mb-6">Gemini is gathering all the stardust for your story.</p>
            
            <div className="w-full bg-sky-50 rounded-full h-4 overflow-hidden mb-2">
              <div 
                className="bg-sky-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-sky-300 font-bold uppercase tracking-widest">
              {Math.round(progress)}% Complete
            </p>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto mb-12 bg-red-50 border-2 border-red-100 rounded-3xl p-6 text-center">
            <i className="fas fa-circle-exclamation text-red-400 text-4xl mb-4"></i>
            <p className="text-red-700 font-bold">{error}</p>
            <button onClick={() => setStep(GenerationStep.IDLE)} className="mt-4 text-red-400 hover:text-red-600 font-bold underline">Try again</button>
          </div>
        )}

        {/* Welcome State */}
        {step === GenerationStep.IDLE && !book && (
          <div className="max-w-4xl mx-auto text-center py-20">
            <div className="mb-8 inline-block bg-sky-100 p-8 rounded-full">
              <i className="fas fa-magic text-sky-500 text-8xl animate-pulse"></i>
            </div>
            <h2 className="text-5xl font-bold text-sky-900 mb-6">Your imagination is the only limit.</h2>
            <p className="text-xl text-sky-600 max-w-2xl mx-auto leading-relaxed">
              Tell us a theme—like "A space cat in search of the milk nebula" or "The dragon who couldn't blow fire"—and we'll create a 10-page illustrated book for you in seconds.
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              {['Space Adventures', 'Friendly Monsters', 'Underwater Tea Party', 'Magic Gardens'].map(t => (
                <button 
                  key={t}
                  onClick={() => { setTheme(t); }}
                  className="bg-white border-2 border-sky-100 hover:border-sky-400 text-sky-700 px-6 py-3 rounded-2xl font-bold shadow-sm transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Book Display */}
        {book && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-6xl font-bold text-sky-900 mb-4 font-story">
                {book.title}
              </h2>
              <div className="flex items-center justify-center gap-4 text-sky-400">
                <span className="w-12 h-0.5 bg-sky-200"></span>
                <span className="font-bold uppercase tracking-widest text-sm">A DreamWeaver Original</span>
                <span className="w-12 h-0.5 bg-sky-200"></span>
              </div>
            </div>

            <div className="space-y-12">
              {book.pages.map((page, index) => (
                <PageCard 
                  key={page.id} 
                  page={page} 
                  pageNumber={index + 1}
                  onUpdateImage={(newUrl) => updatePageImage(page.id, newUrl)}
                />
              ))}
            </div>

            <div className="mt-20 py-12 text-center bg-sky-900 rounded-3xl text-white shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <i key={i} className={`fas fa-star absolute`} style={{ 
                    top: `${Math.random() * 100}%`, 
                    left: `${Math.random() * 100}%`,
                    fontSize: `${Math.random() * 20 + 10}px`
                  }}></i>
                ))}
              </div>
              <h3 className="text-3xl font-bold mb-4 font-story">The End</h3>
              <p className="text-sky-200 mb-8 max-w-md mx-auto">We hope you enjoyed your magical adventure. Ready for another one?</p>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="bg-white text-sky-900 font-bold px-8 py-3 rounded-2xl shadow-xl hover:bg-sky-50 transition-colors"
              >
                Create Another Story
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Bar (Mobile Responsive) */}
      {book && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl border border-sky-100 flex items-center gap-8 z-40 transition-transform md:translate-y-0 translate-y-2 group">
          <div className="flex flex-col items-center">
             <span className="text-[10px] uppercase font-bold text-sky-300">Total</span>
             <span className="text-lg font-bold text-sky-900">10 Pages</span>
          </div>
          <div className="h-8 w-px bg-sky-100"></div>
          <button 
             onClick={handleShare}
             className="text-sky-600 hover:text-sky-800 transition-colors flex flex-col items-center gap-1"
          >
             <i className="fas fa-share-nodes"></i>
             <span className="text-[10px] font-bold uppercase">Share</span>
          </button>
          <div className="h-8 w-px bg-sky-100"></div>
          <button 
             onClick={() => window.print()}
             className="text-sky-600 hover:text-sky-800 transition-colors flex flex-col items-center gap-1"
          >
             <i className="fas fa-print"></i>
             <span className="text-[10px] font-bold uppercase">Print</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
