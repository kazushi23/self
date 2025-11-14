
function main2() {
	// nonDivisibleSubset([19, 10, 12, 10, 24, 25, 22], 4);
    // repeatedString('baabccd', 10);
    // jumpingOnClouds([0,1,0,0,0,1,0,0])
    // superReducedString('baabccdee');
    // alternate("beabeefeab") // abcdabcd
}

// https://www.hackerrank.com/challenges/two-characters/problem?isFullScreen=true
function alternate(s: string): number {
    // left with 2 alternating characters
    var uniqueChar: string[] = []
    for (var char of s) {
        !uniqueChar.includes(char) && uniqueChar.push(char)
    }

    var uniqueCombi: [string, string][] = []
    for (let i = 0; i < uniqueChar.length; i++) {
        for (let j = i + 1; j < uniqueChar.length; j++) {
            uniqueCombi.push([uniqueChar[i]!, uniqueChar[j]!]);
        }
    }

    let biggestValue: number = 0;
    for (var combi of uniqueCombi) {
        let counter: number = 0;
        const finalS: string[] = s.split("").filter(x => combi.includes(x))
        let curr: string = ""
        for (var c of finalS) {
            if (c === curr) {
                counter = 0;
                break
            }
            curr = c
            counter++
        }
        counter > biggestValue && (biggestValue = counter)
    }

    return biggestValue;
}

// https://www.hackerrank.com/challenges/reduced-string/problem?isFullScreen=true
function superReducedString(s: string): string {
    var res: string = "";
    for (var char of s) {
        const lastIndex: number = res.length-1
        if (res == "") {
            res += char;
        } else if (char === res[lastIndex]) {
            res = res.slice(0, lastIndex)
        } else if (char !== res[lastIndex]) {
            res += char
        }
    }
    if (res === "") {
        return "Empty String"
    } else {
        return res;
    }
}

// https://www.hackerrank.com/challenges/jumping-on-the-clouds/problem?isFullScreen=true
function jumpingOnClouds(c: number[]): number {
    var steps: number = 0
    var currInd: number = 0 
    while (currInd <= c.length-1) {
        if (currInd == c.length-1) {
            return steps
        }
        const twoStep: boolean = c[currInd+2] === 0
        twoStep ? currInd += 2 : currInd++
        steps++
    }
    return steps;
}
// https://www.hackerrank.com/challenges/repeated-string/problem?isFullScreen=true
function repeatedString(s: string, n: number): number {
    // first occurrence of 'a'
    const occ: number = s.match(/a/g)?.length || 0;
    const totOcc: number = occ * Math.trunc(n/s.length) // occ * integer divide occ
    // find occurrence of remaining
    const remainingStringIndex: number = n%s.length

    const occR: number = s.slice(0, remainingStringIndex).match(/a/g)?.length || 0;

    return totOcc + occR;
}

// https://www.hackerrank.com/challenges/non-divisible-subset/problem?isFullScreen=true
function nonDivisibleSubset(s: number[], k: number): number {
    // get remainders
    const freq: Map<number, number> = new Map()
    for (var n of s) {
        const remainder: number = n%k
        const currValue: number | undefined = freq.get(remainder)
        if (currValue !== undefined) {
            freq.set(remainder, currValue+1)
        } else {
            freq.set(remainder, 1)
        }
    }

    // if there are remainder 0s, then use 1
    // only one perfectly divisble by k can be included
    // if 2 included, then the subset containing these 2 number will be perfectly divisble by 4
    let result: number = 0
    freq.get(0)! > 0 && result++
    // compare n - k-n
    // 1 - k-1 || 2 - k-2 || 3 - k-3
    // once hit midway, dont need to check
    // dont add k/2 first
    for (var i = 1; i <= k -i; i++) {
        if (i != k/2) {
            const left: number = freq.get(i)!
            const right: number = freq.get(k-i)!
            left > right ? result += left : result += right
        }
    }

    // if k is even, add k/2 (1)
    // k is 4, if you add 2 of remainder 2, then it will become divisible by 4
    if (k%2 === 0 && freq.get(k/2)! > 0) {
        result++
    } 
    return result;
}

main2()