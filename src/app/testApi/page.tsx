"use client";
import { generateRomanStory } from "../utils/generateStory";
import { useState } from "react";

export default function TestApi() {
  const [prompt, setPrompt] = useState("");
  const [story, setStory] = useState<null | {
    chapters: Array<{
      title: string;
      mp3: string;
      images: string[];
    }>;
  }>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await generateRomanStory(prompt);
      setStory(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Roman History Story Generator</h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label htmlFor="prompt" className="block mb-2">
            Enter a title or description for your Roman story:
          </label>
          <input
            type="text"
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Story"}
        </button>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {story && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Your Roman Story</h2>
          {story.chapters.map((chapter, index) => (
            <div key={index} className="mb-6 p-4 border rounded">
              <h3 className="text-lg font-medium mb-2">{chapter.title}</h3>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Audio:</h4>
                <audio src={chapter.mp3} controls className="w-full" />
              </div>

              <div>
                <h4 className="font-medium mb-2">Images:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chapter.images.map((image, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={image}
                      alt={`Illustration for ${chapter.title}`}
                      className="w-full h-auto rounded"
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
