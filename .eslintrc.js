module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
    mocha: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  rules: {
    indent: [
      2,
      2,
      {
        SwitchCase: 1,
        MemberExpression: 1,
        VariableDeclarator: { var: 2, let: 2, const: 3 }
      }
    ],
    'linebreak-style': [2, 'unix'],
    quotes: [1, 'single'],
    semi: [2, 'always']
  }
};
