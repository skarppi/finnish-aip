module.exports = {
	"env": {
        "node": true,
        "es6": true
    },
	"extends": "airbnb",
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module"
    },
    "rules": {
        "semi": ["error", "never"],
        "indent": ["error", 2],
        "import/no-extraneous-dependencies": ["error", {"devDependencies": true}],
    }
}