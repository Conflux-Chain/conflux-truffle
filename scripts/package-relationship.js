// foreach packages package.json in packages
// find host then add host=>dependency and save host to dependcies

const fs = require('fs');
const path = require('path');

function getDistints(arr) {
    const commits = arr.reduce((a, c) => {
        if (a.indexOf(c) < 0) {
            a.push(c);
        }
        return a;
    }, []);
    return commits;
};

function genRelationShips(targets) {

    let dir = path.join(__dirname, "../packages");
    let packages = fs.readdirSync(dir);

    let allRelats = [];

    packages.forEach(pkg => {
        let pkgCfgPath = path.join(dir, pkg, "package.json");
        console.log("pkgCfgPath", pkgCfgPath);
        if (fs.existsSync(pkgCfgPath)) {
            let pkgCfg = require(pkgCfgPath);
            let host = pkgCfg.name;
            let allDependencis = [...Object.keys(pkgCfg.dependencies || {}), ...Object.keys(pkgCfg.devDependencies || {})];
            allDependencis.forEach(dep => {
                allRelats.push({ host, dep });
            });
        }
    });


    let searchResults = [];

    for (let i = 0; i < targets.length; i++) {

        console.log("search for target", targets[i]);

        allRelats.forEach(r => {
            if (r.dep == targets[i]) {
                if (searchResults.map(i => i.host + i.dep).indexOf(r.host + r.dep) < 0) {
                    searchResults.push(r);
                }

                if (targets.indexOf(r.host) < 0) {
                    targets.push(r.host);
                    console.log("add target", r.host);
                }
            }
        });
    }



    return searchResults;

}

let targets = ["@truffle/artifactor", "@truffle/contract", "@truffle/core", "@truffle/interface-adapter", "@truffle/provider", "@truffle/reporters", "conflux-truffle", "web3-providers-http-proxy"];
let result = genRelationShips(targets);
let needFork = getDistints([...result.map(r => r.host), ...result.map(r => r.dep)]);
console.log(result);
console.log(needFork, needFork.length);


