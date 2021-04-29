import { Router } from "express";
import User from "../models/User";
import Code from "../models/Code";
import nodemailer from "nodemailer";
import { sign, verify } from "jsonwebtoken";

const router = Router();

router.post("/send_magic_link", async (req, res) => {
  const { email } = req.body;

  if (typeof email !== "string" || !email.trim())
    return res.status(400).json({
      error: "Invalid email",
      error_description: "Please provide a valid email",
    });

  const userId = (await User.findOne({ email }))?.id;

  const code = Math.floor(Math.random() * 899999 + 100000);

  // Expire after 15 minutes
  const c = new Code({
    code,
    userId,
    email,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  await c.save();

  const transport = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "d9c780094b04e2",
      pass: "875f89b26f98c2",
    },
  });

  transport.verify((e) => {
    if (e) console.error(e);
  });

  const message = {
    from: "test@example.com",
    to: email,
    text: `Enter this code: ${code}`,
    html: `<p>Enter this code: <b>${code}</b></p>`,
  };

  transport.sendMail(message, (err) => {
    if (err) console.error("An error occured while sending email", err);
    else console.log("Mail sent");
  });

  return res.status(200).json({ ok: true });
});

router.get("/token", async (req, res) => {
  const { code: codeFromQs } = req.query;

  if (typeof codeFromQs !== "string" || isNaN(parseInt(codeFromQs)))
    return res.status(400).json({
      error: "Invalid code",
      error_description: "Please send a valid code in the querystring",
    });

  const code = parseInt(codeFromQs);
  const c = await Code.findOne({ code }).exec();
  if (!c)
    return res.status(400).json({
      error: "Invalid code",
      error_description: "Please send a valid code in the querystring",
    });

  const { email, userId } = c as any;
  let user = null;
  if (userId) {
    user = await User.findById(userId).exec();
    if (!user)
      return res.status(400).json({
        error: "Invalid code",
        error_description: "Please send a valid code in the querystring",
      });
  } else {
    user = new User({ email, username: email.split("@")[0] });
    await user.save();
  }

  // Exp in 1 week
  const token = sign(
    { id: user._id.toString() },
    process.env.SECRET || "secret",
    {
      expiresIn: 604800,
    }
  );

  return res.status(200).json({ ok: true, token, user });
});

router.get("/user", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (
    !authHeader ||
    typeof authHeader !== "string" ||
    authHeader.split(" ")?.length !== 2 ||
    authHeader.split(" ")[0].toLowerCase() !== "bearer"
  )
    return res.status(401).json({ error: "Invalid auth header" });

  const identity = verify(
    authHeader.split(" ")[1],
    process.env.SECRET || "secret"
  ) as any;

  if (typeof identity === "string")
    return res.status(401).json({ error: "Invalid token" });

  if (typeof identity.id !== "string")
    return res.status(401).json({ error: "Invalid token" });

  const user = await User.findById(identity.id);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  return res.status(200).json({ ok: true, user });
});

export default router;
