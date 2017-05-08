/**
 * Created by yuqing.kwok on 2017/5/8.
 */

const faker = require('faker');
const fs = require('fs');
const path = require('path');

// console.log(faker);

let a = {
  nodes:[],
  links:[]
};
let b = [];

for (var i = 0; i < 25; i++) {
  b[i] = faker.name.findName();
  // console.log(a[i]);
}

for (let i = 0; i < b.length; i++){
  a.nodes.push({
    id:b[i],
    group:parseInt(Math.random()*5)
  });
  for (let j = 0; j < 2; j++){
    a.links.push({
      source: b[i],
      target: b[parseInt(Math.random()*(b.length-1))],
      value: 1
    });
  }

}


let dataFile = fs.openSync(path.join(__dirname,'./data.json'),'w+');

fs.writeSync(dataFile,JSON.stringify(a));

console.log('done');

