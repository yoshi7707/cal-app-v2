import prisma from '../../lib/prisma';

export default async function handler(req, res) {
  try {
    console.log('Settings API called:', req.method);

    if (req.method === 'GET') {
      const items = await prisma.settingsItem.findMany({
        orderBy: { createdAt: 'desc' },
      });
      console.log('Found items:', items.length);
      const grouped = items.reduce((acc, it) => {
        acc[it.type] = acc[it.type] || [];
        acc[it.type].push(it.name);
        return acc;
      }, {});
      return res.status(200).json({ ok: true, items: grouped });
    }

    if (req.method === 'POST') {
      console.log('POST body:', req.body);
      const { type, name } = req.body || {};
      if (!type || !name) return res.status(400).json({ ok: false, error: 'type and name required' });
      const validTypes = ['doushi', 'onkyo', 'shikai', 'event'];
      if (!validTypes.includes(type)) return res.status(400).json({ ok: false, error: 'invalid type' });

      const exists = await prisma.settingsItem.findFirst({ where: { type, name } });
      if (exists) return res.status(200).json({ ok: true, message: 'already exists' });

      const created = await prisma.settingsItem.create({ data: { type, name } });
      console.log('Created item:', created);
      return res.status(201).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('settings api error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}