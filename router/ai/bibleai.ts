import { Request, Response } from "express";
import axios from "axios";

export default async function bibleAIHandler(req: Request, res: Response) {
  const question = req.query.q as string;

  if (!question) {
    return res.status(400).json({
      creator: "KayzzAoshi",
      status: false,
      message: "Parameter 'q' wajib diisi"
    });
  }

  const translation = "TB";
  const language = "id";
  const filters = ["bible", "books", "articles"];

  const params = new URLSearchParams({
    question,
    translation,
    language,
    "filters[]": filters,
    pro: "false"
  });

  const url = `https://api.bibleai.com/v2/search?${params.toString()}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
        Origin: "https://bibleai.com",
        Referer: "https://bibleai.com/"
      }
    });

    if (!response.data || response.data.status !== 1) {
      return res.json({
        creator: "KayzzAoshi",
        status: false,
        message: "Tidak ada hasil"
      });
    }

    const { answer, sources } = response.data.data;

    let resultMsg = {
      question,
      answer,
      sources: [] as string[]
    };

    if (Array.isArray(sources)) {
      const verses = sources.filter((s: any) => s.type === "verse").slice(0, 10);
      resultMsg.sources = verses.map((s: any) => s.text);
    }

    res.json({
      creator: "KayzzAoshi",
      status: true,
      response: resultMsg
    });

  } catch (err: any) {
    res.status(500).json({
      creator: "KayzzAoshi",
      status: false,
      message: err.message || "Internal Server Error"
    });
  }
}