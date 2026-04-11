import { Request, Response } from 'express'
import axios from 'axios'

async function bypassai(text: string) {
    if (!text) throw new Error("parameter 'text' diperlukan.")

    const { data } = await axios.get(
        'https://31jnx1hcnk.execute-api.us-east-1.amazonaws.com/default/test_7_aug_24',
        {
            headers: {
                origin: 'https://bypassai.writecream.com',
                referer: 'https://bypassai.writecream.com/',
                'user-agent':
                    'mozilla/5.0 (linux; android 15; sm-f958 build/ap3a.240905.015) applewebkit/537.36 (khtml, like gecko) chrome/130.0.6723.86 mobile safari/537.36'
            },
            params: { content: text }
        }
    )

    return data.finalContent.replace(/<span[^>]*>|<\/span>/g, '')
}

export default async function bypassaihandler(req: Request, res: Response) {
    try {
        const text = req.query.text as string

        if (!text) {
            return res.status(400).json({
                creator: "kayzzaoshi",
                status: false,
                error: "parameter 'text' diperlukan"
            })
        }

        const result = await bypassai(text)

        res.json({
            creator: "kayzzaoshi",
            status: true,
            response: result
        })
    } catch (err: any) {
        res.status(500).json({
            creator: "kayzzaoshi",
            status: false,
            error: err.message || "internal server error"
        })
    }
}