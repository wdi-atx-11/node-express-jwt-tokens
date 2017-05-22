# ![](https://ga-dash.s3.amazonaws.com/production/assets/logo-9f88ae6c9c3871690e33280fcf557f33.png) API Authentication with Express - Tokens

### What are the objectives?

*After this workshop, developers will be able to:*
- Understand why authentication tokens are commonly used when interacting with APIs
- Add a token strategy to an application
- Authenticate a user based on their token

### Where should we be now?

*Before this workshop, developers should already be able to:*

- Build a basic Express app
- Understand foundational concepts in authentication & encryption

## Tokens, The Basics

When building APIs, authentication is crucial. When building an API, you're often giving access to private, sometimes sensitive information, and we do not want to be responsible for secrets falling into the wrong hands. It's hard to be too careful, so today, we're going to learn a way to control access to an API that is both simple and secure.

The technique we're going to use today revolves around **tokens**. Tokens are, at their simplest, a unique string that is usually auto-generated. It needs to be long & complex enough that a human would never guess it, and unique enough that only one user in the database can have any particular one.

If we trust that we've designed it that way, then we only have to use a single string of characters to determine both who a user is claiming to be in our database, and that they are who they say they are.

### Kicking it up a notch

That's the overall gist of what tokens do, but today we're going to use a specific type of token. It's a fairly new type of token, that's becoming widely used and trusted in web applications, and it's called a **JSON Web Token** or JWT (pronounced `jot`, if you can believe that).

It is the same idea – a single string of characters to authenticate – but this token isn't just _random_ characters, it's a string of characters that's built by encrypting actual information.

You can play with encoding/decoding the data over at their site as an example. Head on over to [jwt.io](http://jwt.io/#debugger) and see what I mean:

<img width="750" alt="JWTs" src="https://cloud.githubusercontent.com/assets/25366/9151601/2e3baf1a-3dbc-11e5-90f6-b22cda07a077.png">

#### Just like cookies, hmmmm....

In the example above, you'll notice that there are 3 parts. The payload is the one we care the most about, and it holds whatever data we decide to put in there. It's very much like a cookie; we put as few things in there as possible – just the pieces we really need.

Applications can save a JWT somewhere on a user's computer, just like a cookie. Because JWTs can be encrypted into a single string, we can _also_ send it over HTTP really, really easily. Which means it'll work in any server/client scenario you can imagine. Quite nice.

## Explore the `starter-code`
Now, before we talk specifically about JWTs, we've built a really basic starter Express app to hack on for a few minutes. Take 5 minutes to look through it and see what you notice. There are one or two things you might see that are different, but get familiar with what we're working with.

## What's different?

You might notice some interesting things in the `AgentSchema`.

#### 1. Crafting our JSON Return

Unless we modify the code, our JSON objects will get returned in our API with every piece of information in the database. But the fact is, you may sometimes want to omit certain things (like password hashes), or you might also just want to have your JSON look a certain way.

One way to do this is to _transform_ your model's schema.

```js
AgentSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    var returnJson = {
      id: ret._id,
      name: ret.name,
      codename: ret.codename
    };
    return returnJson;
  }
});
```

This is an example of whitelisting, but you could also blacklist if that's easier, by deleting key/value pairs instead:

```js
AgentSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.password;
    return ret;
  }
});
```

#### 2. Encrypting Passwords in the Model, without Passport

Now, if we're not using a `password` attribute, and we still want to do some encryption for fun, we can. We can actually use one of mongoose's built-in hooks – `AgentSchema.pre` – to run a function before we save a document.

```js
// Let's encrypt our name using only the model!
// This is a hook, a function that runs just before you save.
AgentSchema.pre('save', function(next) {
  var agent = this;

  // only hash the name if it has been modified (or is new)
  if (!agent.isModified('name')) return next();

  // just for example purposes, let's keep the agent's name in a separate field
  agent.unencryptedName = agent.name;
  // bcrypt can come up with a salt for us (just pass it a number)
  agent.name = bcrypt.hashSync(agent.unencryptedName, 10);

  next()
});
```

While this is a silly example, because we're still saving the name as plaintext, you can imagine it would be convenient for any information you need encrypted. Say, a password.

This is one of a few ways to get to the same end goal. Since we're not using Passport today, it makes sense to show another way to encrypt information.

#### 3. Hiding `unencryptedName` in `getAll`

So we're encrypting our agent's names (for their security).

Well, in our example today, we're going to make it so that anyone can access a list of agents – **but only those that have been authenticated can see their real names.**

To _hide_ the `unencryptedName` field, we've added one tiny-but-useful command to our `agentsController.getAll` function:

```js
// INDEX
function getAll(request,response){
  Agent.find(function(error, agents){
    if (error) response.json({message: 'There is no MI6, and there are no agents here.'})

    response.json({agents: agents});
  }).select('-unencryptedName');
}
```

See that `.select('-unencryptedName')`? That's one way you can specify the output in your API, by only selecting certain fields after your queries. The minus sign negates it, so we're saying "Find all our agents, then for each one, select all fields _except_ `unencryptedName`".

For more info on `.select`, check out the [documentation](http://mongoosejs.com/docs/queries.html).

So if you start up the app and make an agent:

```
curl -X POST localhost:3000/api/agents -d 'name=James+Bond&codename=007'
```

We can see that `http://localhost:3000/api/agents` returns data like this:

```json
{
  "agents": [
    {
       "id": "55c65c300bb7305be9517c4d",
       "name": "$2a$10$Cg1ty.6NiNQ4vbLFDkof7ebbFE/vfGUXYjjgCAMPoBmC18IwpqGgq",
       "codename": "007"
    }
  ]
}
```

While `https://localhost:3000/api/agents/55c65c300bb7305be9517c4d` returns this:

```json
{
  "agent": {
    "id": "55c65c300bb7305be9517c4d",
    "name": "$2a$10$Cg1ty.6NiNQ4vbLFDkof7ebbFE/vfGUXYjjgCAMPoBmC18IwpqGgq",
    "unencryptedName": "James Bond",
    "codename": "007"
  }
}
```

Now – we have to make sure only people we _allow_ can see the latter.

## The Main Feature, JWTs

We'll have to install a couple npm modules to start working with JWTs & authenticating via tokens.

```bash
npm install --save jsonwebtoken express-jwt
```

Now, of course, we have to require them. Later, you could extract this to a config file if you'd like, but for now let's throw it in `app.js`:

```js
var express = require('express'),
bodyParser  = require('body-parser'),
mongoose    = require('mongoose'),
expressJWT  = require('express-jwt'),
jwt         = require('jsonwebtoken'),
app         = express();

// A secret phrase that only your app knows, so encryption can be consistent. We'll use this later.
var secret = "spectreSkyfallQuantumSolace";
```

Now there are 3 things we're going to need to write:

- [ ] An endpoint to create a token  

- [ ] A middleware that will check for the token  

- [ ] An error handler for when there _isn't_ a token

That's it.

## Creating a token

We don't currently have a controller for authorization, so we're going to put our auth endpoint right in `app.js`. You could (and probably should later) extract it out, so that `app.js` doesn't have a bajillion lines of code in it.

But all we need is a normal Express endpoint. Considering we're _creating_ a token, which HTTP verb would you say we should use? Did someone in the back say `POST`? You guys are so smart.

```js
//app.js
app.post('/api/authorization', function(request, response){
    // some code to check that a user's credentials are right #bcryptmaybe?

    // collect any information we want to include in the token, like that user's info

    // make a token already & send it as JSON
});
```

Pseudocode successful. Let's fill out these bits. Honestly, in this example, we're not gonna bother with checking if a user is who they say they are. You already learned that.

```js
//app.js
app.post('/api/authorization', function(request, response){
  // some code to check that a user's credentials are right #bcryptmaybe?

  // collect any information we want to include in the token, like that user's info
  var myInfo = {
    name: 'James Bond', // or whatever your user's name is
    codename: "007", // or whatever
    id: '55c65c300bb7305be9517c4d' // or whatever
  }

  // make a token already & send it as JSON
  var token = jwt.sign(myInfo, secret);
  response.json({agent: myInfo, token: token})
});
```

The `myInfo` section is easy – it's whatever information might be useful to you later. By having name & ID & whatever else in there, you can quickly do Mongo queries and know about who's accessing each particular request.

The next part, we're using our `jwt` library, and it just takes a few arguments. This comes from the documentation, but basically we pass it the _payload_, aka `myInfo`, and pass it that secret phrase we made earlier (so that tokens can be encrypted consistently), and we have a token.

Finally, we just send `myInfo` and the `token` as JSON, just like you normally do. Let's try our endpoint and see if we get a token back, using something like [Insomnia](http://insomnia.rest/) or [Postman](https://www.getpostman.com/) - however, you can also cURL:

```bash
curl -X POST localhost:3000/api/authorization
```

We should get back something like this:

```js
// http://localhost:3000/api/authorization
{
    "agent": {
        "name": "James Bond",
        "codename": "007",
        "id": "55c65c300bb7305be9517c4d",
        "iat": 1439068729,
        "exp": 1439086729
    },
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiSmFtZXMgQm9uZCIsImNvZGVuYW1lIjoiMDA3IiwiaWQiOiI1NWM2NWMzMDBiYjczMDViZTk1MTdjNGQiLCJpYXQiOjE0MzkwNjg3MjksImV4cCI6MTQzOTA4NjcyOX0.amLmQ-EOIk86lvJ8jTeOuklssmlXyg1jkdC1bLbX7Ek"
}
```

## A middleware to check for our token

Next up, we have to start restricting access. This is supremely easy, since we're using `expressJWT`. It's built in.

Far above any of your routes, add this in your `app.js`:

```js
app.use('/api/agents/:id', expressJWT({secret: secret}));
```

Hello, middleware. It sits between the request & your code, and because it's above any routes you have set up, it'll run first.

It uses the library and checks for a token. That's it. If there is a token, it keeps going & runs your app like normal. It throws your `myInfo` (the payload you embedded in the JWT), into `request.user` _for_ you.

So on any particular route or controller action, you should be able to say, `request.user.name` and get back `James Bond`. You could use that for looking them up in the database, storing their information in an embedded document, whatever you need.

And hopefully it's apparent, but you can customize the URLs you need to restrict. We happened to have chosen this one in particular, but you could easily do the same for all of the agents resource, all of your API, or whatever you like.

That's it. Now the last step.

## An error handler for when there isn't a token
_Technically_, our app is good to go. If you try to access one of your agents, you won't be able to. You'll see a bunch of junk that looks like this:

<img width="795" src="https://cloud.githubusercontent.com/assets/25366/9152366/3074b6be-3dda-11e5-8104-dba53428e936.png">

Lovely. So our last step is to pretty that up with a little error handling.

Just after your middleware, let's make another tiny little middleware:

```js
// JWT access control. Important to have these before our routes, so it can run first!
app.use('/api/agents/:id', expressJWT({secret: secret}));
app.use(function (error, request, response, next) {
  // send an appropriate status code & JSON object saying there was an error, if there was one.
});
```

We just need a tiny `if` statement. In case you've never console.logged it, an error looks something like this:

```json
// example error
{
  "name": "UnauthorizedError",
  "message": "No authorization token was found",
  "code": "credentials_required",
  "status": 401,
  "inner": {
    "message": "No authorization token was found"
  }
}
```

We could reasonably do an `if` statement on any of these. Let's pick one that's readable:

```js
// JWT access control. Important to have these before our routes, so it can run first!
app.use('/api/agents/:id', expressJWT({secret: secret}));
app.use(function (error, request, response, next) {
  // send an appropriate status code & JSON object saying there was an error, if there was one.
  if (error.name === 'UnauthorizedError') {
    // our response
  }
});
```

And finally, let's do what we're great at, returning a response:

```js
// JWT access control. Important to have these before our routes, so it can run first!
app.use('/api/agents/:id', expressJWT({secret: secret}));
app.use(function (error, request, response, next) {
  if (error.name === 'UnauthorizedError') {
    response.status(401).json({message: 'You need an authorization token to view confidential information.'});
  }
});
```

Boom! Now let's see what happens when we try to access an agent:

<img width="794" alt="screen shot 2015-08-08 at 2 36 34 pm" src="https://cloud.githubusercontent.com/assets/25366/9152390/ebd2f394-3dda-11e5-8c7c-df3b25a88e86.png">

A far more beautiful thing.

## Wait, don't leave us – how _do_ we access it?

Last but not least, we need to, um, actually access that resource. Can we now?

You've got it all built, and this final piece will complete the puzzle.

**You send along your token via an Authorization header**, with a value of `"Bearer mylongtokengoesrighthere"`

```
curl http://localhost:3000/api/agents/55c65c300bb7305be9517c4d --header "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmaXJzdF9uYW1lIjoiSm9obiIsImxhc3RfbmFtZSI6IkRvZSIsImVtYWlsIjoiam9obkBkb2UuY29tIiwiaWQiOjEyMywiaWF0IjoxNDM5MDY1NjY1LCJleHAiOjE0MzkwODM2NjV9.DUWF4vAInGeVenMm3thkvIWnC5EvWb0jF3-sYmW949M"
```

If you're using a tool other than CURL, look for where you can add in custom headers:

<img width="700"  src="https://cloud.githubusercontent.com/assets/4304660/26286645/eee57226-3e2f-11e7-8c0f-6f06a6945964.png">

So, just like a client would have to, you'd:

1. POST to your `
` endpoint!
2. Copy that token!
3. GET to a specific agent's endpoint, with an Authorization header!

And there you have it. It's really only a few lines of code we had to write, and once you combine it with bcrypt and hashed passwords, you've got yourself a secure API that can be authorized with a single string of characters.

## Conclusion

In the lab after this, you'll be implementing this all by yourself, from scratch, so ask questions if you have them!

- What is a JWT? Why is useful for authorizing an API?
- How do you create a JWT in an endpoint in your Express app?
- How do you secure an endpoint using a JWT?
