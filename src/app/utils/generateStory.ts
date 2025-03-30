import OpenAI from "openai";
const client = new OpenAI({
  apiKey: "",
  dangerouslyAllowBrowser: true,
}); // Replace with your OpenAI API key

/**
 * Generates a structured story about Roman history based on a title prompt
 * @param prompt A title or description for a story set in ancient Rome
 * @returns A JSON object containing the structured story elements
 */
export async function generateRomanStory(prompt: string): Promise<{
  chapters: Array<{
    title: string;
    mp3: string;
    images: string[];
  }>;
}> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "developer",
        content:
          "All text need to be in french, try to generate between 3 and 5 chapters Generate a JSON object with a story about Roman history, including chapters with titles, mp3 links, and image links" +
          `based on this json template : {
  "chapters": [
    {
      "title": "Chapitre X: Title X",
      "content": "generate the story of this chapter here, need to must contain between 5 and 10 lines",
      "images": [
        "in english: prompt to generate the first image about this chapter, you need to be very precise on the details",
        "in english: prompt to generate the first image about this chapter, you need to be very precise on the details"
      ]
    },
  ]
}
  
put only the content of the json in the response, no other text`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  console.log("Completion:", completion.choices[0].message.content);

  const content = completion.choices[0].message.content;
  const story = content ? JSON.parse(content) : { chapters: [] };
  const storyObject: {
    chapters: Array<{
      title: string;
      mp3: string;
      images: string[];
    }>;
  } = { chapters: [] };

  for (const chapter of story.chapters) {
    const audioResponse = await client.audio.speech.create({
      input: chapter.content,
      model: "tts-1-hd",
      response_format: "mp3",
      instructions:
        "Generate an audio file of the text in French, with a clear and engaging voice as a passionate historian.",
      voice: "ash",
    });

    // Convert the audio response to base64
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const audioBase64 = audioBuffer.toString("base64");

    const images = [];
    for (const image of chapter.images) {
      const imageResponse = await client.images.generate({
        model: "dall-e-3",
        prompt:
          "artistic drawing set in Ancient Rome, The scene is vibrant, full of life, and rich in historical details. The style is semi-realistic with soft lines, capturing the grandeur of Roman civilization and the elegance of its art you need to focus on :" +
          image,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      });
      images.push(`data:image/png;base64,${imageResponse.data[0].b64_json}`);
    }

    storyObject.chapters.push({
      title: chapter.title,
      mp3: `data:audio/mp3;base64,${audioBase64}`,
      images: images,
    });
  }

  console.log("Generated Story:", JSON.stringify(storyObject, null, 2));

  return storyObject;
}
