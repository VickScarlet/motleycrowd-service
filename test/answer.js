import Answer from "../src/question/answer.js";
// debugger
const answers = ['A','B','C','D'];
const answer = new Answer({answers});
const randomAnswer = ()=>answer.answer(
    Math.floor(Math.random()*Date.now()).toString(32),
    answers[Math.floor(Math.random() * answers.length)]
);

let times = 100;
while(times--) randomAnswer();
console.debug(answer.counter);
console.debug(answer.crank());
const scores = {};

// scores.A = {s: 1};
// scores.B = {s: 20 / answer.count('B')};
// scores.C = {s: answer.most('C')?2:0};
// scores.D = {s: answer.least('D')?4:0};
// scores.E = {s: answer.count('E')==1?8:0};
// scores.F = {s: ()=>listRandom([-2,-1,0,1,2])};
// scores.G = {b: 2};
// scores.H = {s: answer.maxsame()>=2?2:0};
// scores.I = {s: answer.same('I')>=2?4:0};
// scores.J = {s: answer.maxsame()===3?3:0};

// scores.A = {s: 0};
// scores.B = {s: answer.most('A')?2:-1};

// scores.A = {s: 50 / answer.count('A')};
// scores.B = {s: 40 / answer.count('B')};
// scores.C = {s: 30 / answer.count('C')};
// scores.D = {s: 20 / answer.count('D')};
// scores.E = {s: 10 / answer.count('E')};

// const mostA = answer.most('A');
// scores.A = {s: mostA?-2:2};
// scores.B = {s: mostA?2:-2};
// scores.C = {s: 0};
// scores.D = {s: 1};

// const a = answer.count('A');
// const b = answer.count('B')*1.5;
// const c = answer.count('C')+15;
// const r = [a,b,c].sort((a,b)=>b-a);
// const j = s=>s==r[0]?2:s==r[2]?-1:0;
// scores.A = {s: j(a)};
// scores.B = {s: j(b)};
// scores.C = {s: j(c)};


// const crank = answer.crank();
// crank.shift().forEach(ans => scores[ans] = {s: -2});
// crank.pop().forEach(ans => scores[ans] = {s: 2});
// crank.flat().forEach(ans => scores[ans] = {s: 0});

// const crank = answer.crank();
// crank.shift().forEach(ans => scores[ans] = {s: -2});
// crank.shift().forEach(ans => scores[ans] = {s: 2});
// crank.flat().forEach(ans => scores[ans] = {s: 0});

// const crank = answer.crank();
// const most = crank[0];
// const pk = (a,b) => {
//     switch (a+b) {
//         case 'AB': case 'BC': case 'DB':
//         case 'CA': case 'CD': return 2;

//         case 'AC': case 'BA': case 'BD':
//         case 'CB': case 'DC': return -2;

//         default: return 0;
//     }
// }
// const tempScores = {A:0, B:0, C:0, D:0};
// crank.pop().forEach(a => {
//     most.forEach(b=>{
//         const result = pk(a,b);
//         tempScores[a] += result;
//         tempScores[b] -= result;
//     });
// });
// for(const ans in tempScores) {
//     scores[ans] = {s: tempScores[ans]};
// }

// scores.A = {s: answer.most('A')?-1:0};
// scores.B = {s: answer.most('B')?-1:1};
// scores.C = {s: answer.most('C')?-1:2};
// scores.D = {s: answer.most('D')?-1:3};
// scores.E = {s: answer.most('E')?-1:4};

scores.A = {s: answer.most('A')?0:1};
scores.B = {s: answer.most('B')?0:2};
scores.C = {s: answer.most('C')?0:3};
scores.D = {s: answer.most('D')?0:4};

console.debug(scores);

const questions = $question.randomQuestions();
const test = (question, count=100)=>{
    const randomAnswer = question=>{
        const options = Object.keys(question.options);
        return question.answer(
            Math.floor(Math.random()*Date.now()).toString(32),
            options[Math.floor(Math.random() * options.length)]
        )
    };
    while(count--) randomAnswer(question);
}
