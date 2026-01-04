
import React, { useState } from 'react';
import { PageData } from '../types';
import { editImage } from '../services/geminiService';

interface PageCardProps {
  page: PageData;
  pageNumber: number;
  onUpdateImage: (newUrl: string) => void;
}

const PageCard: React.FC<PageCardProps> = ({ page, pageNumber, onUpdateImage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPrompt.trim() || !page.imageUrl) return;

    setIsProcessing(true);
    setError(null);
    try {
      const updatedUrl = await editImage(page.imageUrl, editPrompt);
      onUpdateImage(updatedUrl);
      setIsEditing(false);
      setEditPrompt('');
    } catch (err) {
      console.error(err);
      setError("Oops! I couldn't edit the magic painting. Try again?");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden transition-all hover:shadow-2xl flex flex-col md:flex-row min-h-[400px]">
      {/* Image Section */}
      <div className="md:w-1/2 relative group bg-sky-50 flex items-center justify-center overflow-hidden">
        {page.isGeneratingImage ? (
          <div className="flex flex-col items-center justify-center p-8 text-center animate-pulse">
            <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sky-600 font-bold">Magic brushes are painting...</p>
          </div>
        ) : page.imageUrl ? (
          <>
            <img 
              src={page.imageUrl} 
              alt={`Illustration for page ${pageNumber}`} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-sky-600 p-3 rounded-full shadow-lg transition-colors flex items-center gap-2 font-bold"
            >
              <i className="fas fa-magic"></i>
              <span>Edit Magic</span>
            </button>
          </>
        ) : (
          <div className="text-sky-300">
             <i className="fas fa-image text-6xl"></i>
          </div>
        )}

        {/* Edit Modal Overlay */}
        {isEditing && (
          <div className="absolute inset-0 bg-sky-900/80 flex items-center justify-center p-6 z-10 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-sky-900">Change the Magic</h3>
                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">Try: "Add a retro filter", "Make it nighttime", or "Add a friendly dragon".</p>
              <form onSubmit={handleEdit} className="space-y-4">
                <input 
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Tell Gemini what to do..."
                  className="w-full border-2 border-sky-100 rounded-xl p-3 focus:border-sky-400 outline-none transition-all"
                  autoFocus
                />
                {error && <p className="text-red-500 text-xs italic">{error}</p>}
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    disabled={isProcessing || !editPrompt.trim()}
                    className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-wand-magic-sparkles"></i>
                    )}
                    Apply
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border-2 border-gray-100 text-gray-400 rounded-xl font-bold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Text Section */}
      <div className="md:w-1/2 p-8 flex flex-col justify-center">
        <div className="mb-4">
          <span className="inline-block bg-sky-100 text-sky-600 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-2">
            Page {pageNumber}
          </span>
        </div>
        <p className="font-story text-2xl text-sky-900 leading-relaxed italic">
          "{page.text}"
        </p>
      </div>
    </div>
  );
};

export default PageCard;
