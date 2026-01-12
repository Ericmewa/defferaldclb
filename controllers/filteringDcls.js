app.get("/api/dcls/active", async (req, res) => {
  const { userId, role } = req.query;

  let filter = "";

  if (role === "cocreator") filter = `creator_id = ? AND status NOT IN ('completed')`;
  if (role === "rm") filter = `rm_id = ? AND status IN ('pending_rm','rm_uploading')`;
  if (role === "checker") filter = `checker_id = ? AND status IN ('pending_checker')`;

  const [rows] = await db.query(
    `SELECT * FROM checklists WHERE ${filter}`,
    [userId]
  );

  res.json(rows);
});
    

// fetch completed dcls
app.get("/api/dcls/completed", async (req, res) => {
  const { userId, role } = req.query;

  let filter = "";

  if (role === "cocreator") filter = `creator_id = ? AND status = 'completed'`;
  if (role === "rm") filter = `rm_id = ? AND status = 'completed'`;
  if (role === "checker") filter = `checker_id = ? AND status = 'completed'`;

  const [rows] = await db.query(
    `SELECT * FROM checklists WHERE ${filter}`,
    [userId]
  );

  res.json(rows);
});

// 