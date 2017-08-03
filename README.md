# Deon

This is the Monstercat.com website project. Feel free to inspect and contribute. 

## About the Stack

This website uses custom functions that started out as an experimental project for our site redesign. You can find more information at `src/js/declare.js`.

## Quick Start

```
npm install
npm start
```

## Production Testing
These commands will load in `production.html` instead of `development.html` which changes the endpoint and the Stripe public key.

From src folder: `npm start -- production`

From bin folder:  
```
npm run build
npm run serve-bin
```

Read the package.json for more commands.

## Contributing

 * Contributions will be subject to code review before being considered.
 * Create a new branch for any changes.
 * Follow Google's JavaScript Guide, minus the specific requirements.
 * The test(s) should pass before submitting a PR.

