const FireBird = require("fb-core");



window.app = new FireBird({
    el: "#app",
    template: "#view",

    data() {
        return {
            name: "index"
        };
    }


});