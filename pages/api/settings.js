import prisma from '../../lib/prisma';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const items = await prisma.settingsItem.findMany({
        orderBy: { createdAt: 'desc' },
      });
      const grouped = items.reduce((acc, it) => {
        acc[it.type] = acc[it.type] || [];
        if (it.type === 'event') {
          acc[it.type].push(it.name);
        } else {
          acc[it.type].push({ name: it.name, lineId: it.lineId || null });
        }
        return acc;
      }, {});
      return res.status(200).json({ ok: true, items: grouped });
    }

    if (req.method === 'POST') {
      const { type, name, lineId } = req.body || {};
      if (!type || !name) return res.status(400).json({ ok: false, error: 'type and name required' });
      const validTypes = ['doushi', 'onkyo', 'shikai', 'event'];
      if (!validTypes.includes(type)) return res.status(400).json({ ok: false, error: 'invalid type' });

      const item = await prisma.settingsItem.upsert({
        where: {
          type_name: { type, name } // Use the new compound unique key
        },
        update: { lineId: lineId || null },
        create: { type, name, lineId: lineId || null },
      });

      return res.status(201).json({ ok: true, item });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('settings api error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}