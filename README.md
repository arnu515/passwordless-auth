> This is a copy-paste of the original post on [dev.to](https://dev.to/arnu515/implement-password-less-authentication-in-your-apps-magic-sign-in-14cn)

# Implement Passwordless sign-in in your apps

In this post, I'll show you how you can implement passwordless sign in, or "magic-link" sign in to your web app.

## Tech stack
- [SvelteJS](https://svelte.dev) with [Vite](https://vitejs.dev) and [Typescript](https://typescriptlang.org) for the frontend with:
  - [W3.CSS](https://w3schools.com/w3css) for the styling.
- NodeJS typescript for the backend with:
  - ExpressJS
  - MongoDB

> If you don't know typescript, feel free to use plain javascript. Just remember, you can't use some features I can.

## Create the project

### Frontend

Creating a svelte + vite = svite app is pretty easy! All you have to do is enter this command into your terminal

```bash
npm init @vitejs/app
```

I'll choose `frontend` for the project name, `svelte` for the framework and the `Typescript` variant.

Next, you can `cd` into your project and run
```bash
yarn # installs packages
yarn dev # starts the DEV server
```

You can now access your frontend app at <http://localhost:3000>.

> Feel free to use `npm` or `pnpm` instead.

### Backend

The backend setup has more steps, however.

- Create our project
```bash
# Create backend folder and cd into it
mkdir backend && cd backend
# Create a package.json
yarn init --yes # or npm init -y
```

> I removed the `main` field in `package.json`.

- Install packages
```bash
# feel free to use npm/pnpm instead
yarn add express \
  cors \
  morgan \
  mongoose \
  jsonwebtoken \
  nodemailer \
```

- **(TYPESCRIPT ONLY)** Install typedefs of packages, and other dev dependencies
```bash
# feel free to use npm/pnpm instead
yarn add -D \ 
  @types/express @types/cors @types/morgan @types/mongoose @types/jsonwebtoken @types/nodemailer \
  @types/node \
  ts-node \
  typescript \
  nodemon
```
- Add scripts in `package.json`
```json
"scripts": {
  "build": "tsc -p .",
  "build:watch": "tsc -p . -w",
  "start": "node dist/index.js",
  "start:watch": "nodemon dist/index.js",
  "dev": "npm-run-all -p build:watch start:watch"
}
```

- **(TYPESCRIPT ONLY)** Add a `tsconfig.json`
```bash
npx tsconfig.json
# select "node" from the options
```

Add this to `compilerOptions` in your tsconfig:
```json
"skipLibCheck": true
```

> I removed the `baseUrl` field in the config

- Create folders and files
```bash
mkdir -p src/controllers src/models src/middlewares src/util
touch src/index.ts # use js for javascript
```

## How it works

Before we start with actual coding, let's take a look at how passwordless authentication, or "magic-link" authentication works.

1. First, we ask the user for their email. This happens on the **frontend**.
2. Next, the **frontend** sends the email to the **backend**.
3. The **backend** searches the **database** for a user with the provided email. If a user is found, the user is **logging in**. Otherwise, the user is **registering**.
4. The **backend** generates a code for the user, and stores it in the database. It sends the code to the user via **email**.
5. The email contains a **link** to get the user authenticated. This link may/maynot need a code. Hence, the term **magic link**.
6. The user enters the code, the backend checks it, and if the code is valid, the user is successfully authenticated.

## Backend coding

Let's start with the backend, so we know what to do in the frontend.

### Main app

Start with the main file, `src/index.ts`

```typescript
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import { createServer } from "http";

mongoose.connect(process.env.MONGODB_URL || "mongodb://localhost:27017/db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const { PORT = 5000 } = process.env;
createServer(app).listen(PORT, () =>
  console.log("Server started on port " + PORT)
);

```

#### Read environment variables from a file

Using the NPM package `dotenv`, we can read environment variables like `MONGODB_URL` from a file. 

First, install the package:
```bash
yarn add -D dotenv # or use npm/pnpm
```

Next, add this to the TOP (even before all imports) of `src/index.ts`.
```typescript
if ((process.env.NODE_ENV || "development") === "development")
  require("dotenv").config(require("path").join(__dirname, "..", ".env"));
```

#### I don't have mongodb!

If you don't have mongodb/can't install it, you can either use the [Docker image](https://hub.docker.com/_/mongo), or use [MongoDB Atlas](https://cloud.mongodb.com)

Make sure to add your MongoDB connection URI to your environment:
```bash
export MONGODB_URL=<YOUR URL>
```

> Or add the same thing to a file named `.env`

### Models

Let's work on our Mongoose models. For this project, we'll have two models - the User model and the Code model

#### User model

```typescript
// src/models/User.ts

import { Schema, model } from "mongoose";

export const UserSchema = new Schema({
  email: String,
  username: String,
  role: { type: String, default: "member" },
});

const User = model("User", UserSchema);

export default User;
```

#### Code model

```typescript
// src/models/Code.ts

import { Schema, model } from "mongoose";

export const CodeSchema = new Schema({
  code: Number,
  email: String,
  expiresAt: Number,
  // Exists only if the user is logging in.
  userId: { type: String, nullable: true },
});

const Code = model("Code", CodeSchema);

export default Code;
```

### Auth routes

```typescript
// src/controllers/auth.ts

import { Router } from "express";

const router = Router();

router.post("/send_magic_link", (req, res) => {
  // Code to send the email
});

router.get("/token", (req, res) => {
  // Code to generate a token from the code in the email
});

router.get("/user", (req, res) => {
  // Code to fetch the user from the token
})

export default router;
```

Let's register this controller:
```typescript
// src/controllers/index.ts
import auth from "./auth";
import { Router as ExpressRouter } from "express";

export interface Router {
  router: ExpressRouter;
  path?: string;
}

export default [{ router: auth, path: "/api/auth" }] as Router[];

// --------------------------

// src/index.ts
// ...
import controllers from "./controllers";
// ...
app.use(express.json());
controllers.forEach((c) => app.use(c.path || "/", c.router));
```

In this controller, we'll have two API routes. One to generate the code and send it by email, and the other to validate the code and return a token.

First, let's focus on the route to generate the code. We'll be working with the `POST` method for `/send_magic_link`.

- Add some code to get the email from the request body
```typescript
  const { email } = req.body;

  if (typeof email !== "string" || !email.trim())
    return res
      .status(400)
      .json({
        error: "Invalid email",
        error_description: "Please provide a valid email",
      });

  return res.status(200).json({ ok: true });
```

- Add some code to check if there's a user with that email
```typescript
  const userId = (await User.findOne({email}))?.id;
```
> Be sure to import `User` and make the function `async`.

- Add code to generate a random 6-digit code
```typescript
  const code = Math.floor((Math.random() * 899999) + 100000);
```

- Add code to add the generated code to the database
```typescript
  // Expire after 15 minutes
  const c = new Code({
    code,
    userId,
    email,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  await c.save();
```

- If we test our code, you'll notice that we now have a new entry in our database

```javascript
// codes collection

{
  _id: 608a5e125f5f267eccf58bd4,
  code: 504837,
  email: "test@email.com",
  expiresAt: 1619682057847,
  __v: 0
}
```

- Add code to send email
```typescript
  const transport = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "xxxxxxx",
      pass: "xxxxxxx",
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
```

I'm using [MailTrap](https://mailtrap.io) for a free mail server, but you can use any other service.

- You should now have a working mail sender. Test the endpoint to make sure that mails do get sent.

- If you followed all steps correctly, you should get an email with this text:
```
Enter this code: <SOME CODE>
```

Now, we can work on generating a token from the code.

- Import `sign` and `verify` from `jsonwebtoken`
```typescript
import {sign, verify} from "jsonwebtoken";
```

- Add code to check the validity of the generated code
```typescript
router.get("/token", async (req, res) => {
  const {code: codeFromQs} = req.query;

  if (typeof codeFromQs !== "string" || isNaN(parseInt(codeFromQs)))
    return res.status(400).json({error: "Invalid code", error_description: "Please send a valid code in the querystring"})

  const code = parseInt(codeFromQs);
  const c = await Code.findOne({code});
  if (!c)
    return res.status(400).json({error: "Invalid code", error_description: "Please send a valid code in the querystring"})

  return res.status(200).json({ok: true})
});
```

- Add code to add user to database and generate a token
```typescript

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
```

- Now you should be able to send a request to the endpoint, providing the code in the query. This will return you a token and with the user.

Finally, let's add an endpoint to get the user from the token:

```typescript
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
```

This is what your final `auth.ts` controller should look like:

{% gist 56c8e05f0dfcc858025d7b927f5d5b82 %}

## Frontend

With the backend all done and complete, we can start work on the frontend.

Let's add a CSS library to make our lives easier. In the `<head>` tag of `index.html`, add:
```html
<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css" />
```

I'll add an `Auth.svelte` component which will contain the auth form

```html
<!-- src/lib/components/Auth.svelte -->

<script lang="ts">
  async function requestCode() {}
</script>

<div class="w3-border w3-border-gray w3-padding w3-rounded">
  <h2 class="w3-center">Authenticate</h2>

  <form class="w3-margin" on:submit="{requestCode}">
    <p>
      <label for="email">Email</label>
      <input type="email" id="email" class="w3-input w3-border w3-border-gray" />
    </p>
    <p>
      <button class="w3-button w3-black w3-hover-black" style="width: 100%"
        >Get magic link</button
      >
    </p>
  </form>
</div>
```

Now it's time to add some functionality to our app. I'll add a `submit` handler to the form which will ask our backend for the code.

```typescript
  // <script> tag

  import { createEventDispatcher } from "svelte";

  const d = createEventDispatcher();

  async function requestCode() {
    const email = (document.getElementById("email") as HTMLInputElement)?.value;
    if (!email?.trim()) return;

    try {
      const res = await fetch("http://localhost:5000/api/auth/send_magic_link", {
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email }),
        method: "POST"
      });

      const data = await res.json();
      if (res.ok && data.ok) d("prompt-code");
      else {
        console.error(data);
        alert(data.error || res.statusText);
      }
    } catch (e) {
      console.error(e);
      alert("An unknown error occured");
    }
  }
```

Here's our `Auth.svelte file`:

{% gist 56c8e05f0dfcc858025d7b927f5d5b82 %}

After we receive an email, we need to be able to enter the code in it. I'll create a new `Code.svelte` component, which will contain the following code:

{% gist 56c8e05f0dfcc858025d7b927f5d5b82 %}

Notice how these two files emit events? We need to handle these events in `App.svelte`. 

```html
<!-- src/App.svelte -->
<script lang="ts">
  import Auth from "./lib/components/Auth.svelte";
  import Code from "./lib/components/Code.svelte";

  let sentLink = false;
  let token = localStorage.getItem("token");
</script>

<h1 class="w3-center">Welcome</h1>
{#if !token}
  <div class="w3-container">
    {#if !sentLink}
      <Auth on:prompt-code="{() => (sentLink = true)}" />
    {:else}
      <Code
        on:authenticated="{({ detail: token }) => {
          localStorage.setItem('token', token);
          window.location.reload();
        }}"
      />
    {/if}
  </div>
{:else}
<!-- Add code to show user information -->
{/if}
```

We should now have a working auth page. But we're not done yet! We still need to fetch the user from the server!

Here's the final code for that:

{% gist 56c8e05f0dfcc858025d7b927f5d5b82 %}

## Conclusion

And that's it! We're done with a basic, simple, magic-link sign in. But do note that this method here isn't optimised for production or anything, it is just an introduction to email sign in.

In a realworld app, you should **NEVER** store the JWT in `localStorage`. Always use cookies, or use `express-session`.

If you got stuck somewhere, checkout the [Github](https://github.com/arnu515/passwordless-auth) repo, and feel free to give your thoughts in the comments!
