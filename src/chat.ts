import { Application, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  device_id: string | null;
  reply_to: string | null;
  reply_preview: string | null;
  image_url: string | null;
  audio_url: string | null;
  audio_title: string | null;
  avatar_color: string;
  photo_url: string;
  reply_username?: string;
  reply_message?: string;
  created_at: string;
}

interface UserProfile {
  device_id: string;
  username: string;
  avatar_color: string;
  bio: string;
  photo_url: string;
  is_admin: boolean;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
}

const chats: ChatMessage[] = [];
const users = new Map<string, UserProfile>();
const blacklist = new Set<string>();
const groups = new Map<string, Group>();
const groupMembers = new Map<string, Set<string>>();
const groupChats = new Map<string, ChatMessage[]>();

export function registerChatRoutes(app: Application): void {

  app.post('/api/chat/register', (req: Request, res: Response) => {
    try {
      const { device_id, username, avatar_color, bio, photo_url } = req.body;
      if (!device_id || !username?.trim()) return res.status(400).json({ success: false, message: 'Missing fields' });

      const cleanName = username.trim().substring(0, 20);

      if (users.has(device_id)) {
        return res.json({ success: true, already: true, user: users.get(device_id) });
      }

      for (const u of users.values()) {
        if (u.username.toLowerCase() === cleanName.toLowerCase()) {
          return res.status(409).json({ success: false, message: 'Username "' + cleanName + '" sudah dipakai!' });
        }
      }

      const isAdmin = cleanName.toLowerCase() === 'kazztzyyy';
      const user: UserProfile = {
        device_id,
        username: cleanName,
        avatar_color: avatar_color || '#8b5cf6',
        bio: bio || '',
        photo_url: photo_url || '',
        is_admin: isAdmin,
        created_at: new Date().toISOString()
      };
      users.set(device_id, user);
      res.json({ success: true, already: false, user });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });

  app.get('/api/chat/messages', (req: Request, res: Response) => {
    try {
      const after = req.query.after as string;
      let msgs = chats.slice();
      if (after) {
        msgs = msgs.filter(m => m.created_at > after);
      } else {
        msgs = msgs.slice(-100);
      }
      const withReply = msgs.map(m => {
        if (m.reply_to) {
          const replied = chats.find(c => c.id === m.reply_to);
          return { ...m, reply_username: replied?.username, reply_message: replied?.message };
        }
        return m;
      });
      res.json({ success: true, messages: withReply });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });

  app.post('/api/chat/send', (req: Request, res: Response) => {
    try {
      const { username, message, device_id, reply_to, reply_preview, image_url, audio_url, audio_title, avatar_color, photo_url } = req.body;
      if (!username || !message?.trim()) return res.status(400).json({ success: false, message: 'Missing fields' });
      if (message.length > 2000) return res.status(400).json({ success: false, message: 'Too long' });

      if (device_id && device_id !== 'bot') {
        if (blacklist.has(device_id)) return res.status(403).json({ success: false, message: 'Kamu telah di-kick dari chat!' });
        const last = chats.filter(m => m.device_id === device_id).pop();
        if (last && Date.now() - new Date(last.created_at).getTime() < 2000) {
          return res.status(429).json({ success: false, message: 'Tunggu 2 detik!' });
        }
      }

      const msg: ChatMessage = {
        id: uuidv4(),
        username: username.substring(0, 20),
        message: message.trim(),
        device_id: device_id || null,
        reply_to: reply_to || null,
        reply_preview: reply_preview || null,
        image_url: image_url || null,
        audio_url: audio_url || null,
        audio_title: audio_title || null,
        avatar_color: avatar_color || '#8b5cf6',
        photo_url: photo_url || '',
        created_at: new Date().toISOString()
      };
      chats.push(msg);
      if (chats.length > 500) chats.splice(0, chats.length - 500);
      res.json({ success: true, message: msg });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });

  app.get('/api/chat/profile/:deviceId', (req: Request, res: Response) => {
    try {
      const profile = users.get(req.params.deviceId) || null;
      res.json({ success: true, profile });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });

  app.put('/api/chat/profile', (req: Request, res: Response) => {
    try {
      const { device_id, avatar_color, bio, photo_url, display_name } = req.body;
      if (!device_id) return res.status(400).json({ success: false });

      const existing = users.get(device_id);
      if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

      if (display_name?.trim()) {
        const cleanName = display_name.trim().substring(0, 20);
        for (const [did, u] of users.entries()) {
          if (did !== device_id && u.username.toLowerCase() === cleanName.toLowerCase()) {
            return res.status(409).json({ success: false, message: 'Nama "' + cleanName + '" sudah dipakai!' });
          }
        }
        existing.username = cleanName;
      }
      existing.avatar_color = avatar_color || existing.avatar_color;
      existing.bio = bio?.substring(0, 100) || existing.bio;
      existing.photo_url = photo_url ?? existing.photo_url;
      users.set(device_id, existing);
      res.json({ success: true, profile: existing });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });

  app.post('/api/chat/kick', (req: Request, res: Response) => {
    try {
      const { admin_device_id, target_device_id } = req.body;
      const admin = users.get(admin_device_id);
      if (!admin?.is_admin) return res.status(403).json({ success: false, message: 'Bukan admin' });
      blacklist.add(target_device_id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });

  app.get('/api/groups', (req: Request, res: Response) => {
    try {
      const { device_id } = req.query;
      const result = [...groups.values()].map(g => ({
        ...g,
        member_count: groupMembers.get(g.id)?.size || 0,
        is_member: !!(device_id && groupMembers.get(g.id)?.has(device_id as string))
      }));
      res.json({ success: true, groups: result });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });

  app.post('/api/groups/create', (req: Request, res: Response) => {
    try {
      const { name, description, device_id, username } = req.body;
      if (!name?.trim() || !device_id) return res.status(400).json({ success: false });
      const user = users.get(device_id);
      if (!user?.is_admin) return res.status(403).json({ success: false, message: 'Hanya admin yang bisa buat group!' });
      const g: Group = {
        id: uuidv4(),
        name: name.substring(0, 30),
        description: description?.substring(0, 100) || '',
        created_by: device_id,
        created_at: new Date().toISOString()
      };
      groups.set(g.id, g);
      const members = new Set<string>();
      members.add(device_id);
      groupMembers.set(g.id, members);
      groupChats.set(g.id, []);
      res.json({ success: true, group: g });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });

  app.post('/api/groups/join', (req: Request, res: Response) => {
    try {
      const { group_id, device_id } = req.body;
      if (!groupMembers.has(group_id)) groupMembers.set(group_id, new Set());
      groupMembers.get(group_id)!.add(device_id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });

  app.get('/api/groups/:id/messages', (req: Request, res: Response) => {
    try {
      const msgs = groupChats.get(req.params.id) || [];
      const after = req.query.after as string;
      const filtered = after ? msgs.filter(m => m.created_at > after) : msgs.slice(-100);
      res.json({ success: true, messages: filtered });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });

  app.post('/api/groups/:id/send', (req: Request, res: Response) => {
    try {
      const { username, message, device_id, reply_to, reply_preview, image_url, audio_url, audio_title, avatar_color, photo_url } = req.body;
      if (!username || !message?.trim()) return res.status(400).json({ success: false });
      if (message.length > 2000) return res.status(400).json({ success: false });

      if (device_id && device_id !== 'bot' && blacklist.has(device_id)) {
        return res.status(403).json({ success: false, message: 'Kamu telah di-kick!' });
      }

      const msgs = groupChats.get(req.params.id) || [];
      const msg: ChatMessage = {
        id: uuidv4(),
        username: username.substring(0, 20),
        message: message.trim(),
        device_id: device_id || null,
        reply_to: reply_to || null,
        reply_preview: reply_preview || null,
        image_url: image_url || null,
        audio_url: audio_url || null,
        audio_title: audio_title || null,
        avatar_color: avatar_color || '#8b5cf6',
        photo_url: photo_url || '',
        created_at: new Date().toISOString()
      };
      msgs.push(msg);
      groupChats.set(req.params.id, msgs);
      res.json({ success: true, message: msg });
    } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
  });
}
