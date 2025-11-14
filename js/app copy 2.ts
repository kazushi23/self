
function main3() {
    scopes()
    types()
    typescriptTypes()
    eventLoop()
    romanNumerals("vvv")
}
function romanNumerals(numeral: string): number {
    numeral = numeral.toUpperCase();
    let tot: number = 0;
    let i: number = 0
    const romanObj: Record<string, number> = {"I":1,"V":5,"X":10,"L":50,"C":100,"D":500,"M":1000};
    // check on how many unique roman
    const uniqueRoman: Array<string> = [...new Set(numeral.split(""))]
    if (uniqueRoman.length === 1) {
        if (["I","X","C"].includes(uniqueRoman[0]!)) return 0;
        tot += numeral.length * romanObj[numeral[i]!]!
    } else {
        for (i; i < numeral.length; i++) {
            const currR: string | undefined = numeral[i]!
            const nextR: string | undefined = numeral[i+1]!

            const curr: number | undefined = romanObj[currR]
            const next: number | undefined = romanObj[nextR]
            const prev: number | undefined = romanObj[numeral[i-1]!]
            if (["I","X"].includes(currR!)) {
                if (currR === "I" && !["V","X"].includes(nextR)) return 0;
                if (currR === "X" && !["L","C"].includes(nextR)) return 0;
            }

            if (next === undefined) {
                if (curr! <= prev!) {
                    tot += curr!
                } else if (curr! < prev!) {
                    tot -= curr!
                }
            } else {
                if (curr! >= next!) {
                    tot += curr!
                } else if (curr! < next!) {
                    tot -= curr!
                }
            }
        }
    }
    console.log("roman: ", tot)
    return tot;
}
// let vs var vs const
// var is function-scoped, var is hoised
// let and const is block scopes
function scopes() {
    if (1 + 1 === 2) {
        // console.log(x) // undefined (var is hoisted, even in strict mode)
        var x = 0;
    }
    // console.log(x); // 0 (var is function-scoped)
    // If x was declared with let or const ->å ReferenceError (block-scoped)
}

function types() {
    // string
    const name = "kazushi";
    // number (include int and float)
    const age = 35;
    const price = 29.90;
    // special numbers
    const infinity = Infinity;
    const notNum = NaN;
    // bigint
    const bigN = 9007199254740991n;
    // boolean
    const isActive = true;
    // undefined
    let x; // => x === undefined
    // null
    const user = null
    // symbol
    const id = Symbol('id')
    const id2 = Symbol('id')
    // const never = (id === id2) as it will always be unique

    // Primitive vs Objects
    let a = 5;
    let b = a; // copy by value
    b = 10;
    console.log(a); // unchanged
    // Object
    let obj1: Record<string, number> = {"count": 5};
    let obj2 = obj1; // copy. by reference
    obj2.count = 10;
    console.log(obj1.count); // 10 changed

    // Primitives are immutable
    let str = "hello";
    // str[0] = "H"; // not allowed: Index signature in type 'String' only permits reading.ts(2542)

    // Objects are mutable
    let obj: Record<string, string> = {"name": "kazushi"}
    obj.name = "Fujiwara" // it will change
    console.log(obj.name) // Fujiwara

    // Falsy value
    Boolean(false);
    Boolean(0);
    Boolean(-0);
    Boolean(0n);
    Boolean("");
    Boolean(null);
    Boolean(undefined);
    Boolean(NaN);

    // Truthy value
    Boolean(true);
    Boolean(1);
    Boolean("nonemptystring");
    Boolean([]);
    Boolean({});
    Boolean(function(){});

    // Conditional checks
    if (name) {
        // This runs if name is truthy
        // Does NOT run if name is: "", 0, null, undefined
    }

    // Better for checking existence
    if (name !== undefined && name !== null) {
        // More explicit
    }
    // Or use nullish coalescing
    const displayName = name ?? "Anonymous"; // Only null/undefined fallback

    // vs OR operator (any falsy value)
    const displayName2 = name || "Anonymous"; // 0, "" also trigger fallback
}

function typescriptTypes() {
    // When to use interface
    // 1. Object shapes
    interface User {
        id: number;
        name: string;
        email: string;
    }

    // 2. Class implementations
    class UserModel implements User {
        id: number;
        name: string;
        email: string;
        defaultAge: number = 9; // either you give default or you declare in constructor
        careful!: Boolean; // this tells typescript, trust me, i will assign this before use
        // without constructor, i will have error above
        constructor() {
            this.id = 0;
            this.name = "";
            this.email = "";
        }
    }

    // 3. Declaration merging (extending existing interfaces)
    interface Window {
        myCustomProperty: string;
    }
    // Later in another file
    interface Window {
        anotherProperty: number;
    }
    // Both properties are now on Window! MERGES BUT TYPE WILL HAVE DUPLICATE ERROR

    // 4. Extending other interfaces
    interface Admin2 extends User {
        role: "admin";
        permissions: string[];
    }

    // When to use type
    type PartialUser = Partial<User>; // { id?: number; name?: string; email?: string; }

    type RequiredUser = Required<User> // Required - make all properties required

    type UserPreview = Pick<User, "id" | "name">; // {id: number; name: string;}

    type UserWithoutEmail = Omit<User, "email">; // {id: number; name: string;}

    type UserRoles = Record<string, "admin" | "user">; // {[key:string]: admin | user}

    type ReadOnlyUser = Readonly<User>; // make all properties readonly

    function getUser() {
        return {id: 1, name: "kazushi"}
    }

    type UserReturn = ReturnType<typeof getUser>;

    // 1. Union types -> INTERFACE CANNOT BE UNION
    type Status = "pending" | "approved" | "rejected";
    type ID = string | number;

    // 2. Intersection types
    type Admin = User & { role: "admin" };

    // 3. Primitive aliases
    type Email = string;

    // 4. Tuple types
    type Coordinate = [number, number];

    // 5. Function types
    type CalculateFn = (a: number, b: number) => number;

    // 6. Mapped types
    type Readonly<T> = {
        readonly [P in keyof T]: T[P];
    };

    // 7. Conditional types
    type IsString<T> = T extends string ? "yes" : "no";
}

function eventLoop() {
    console.log("1")
    setTimeout(() => {
        console.log("2")
    }, 0);
    Promise.resolve().then(() => {
        console.log("3")
    })
    console.log("4")

    // 1, 4, 3, 2
    // Call Stack
    // Web APIs (settimeout, fetch, console, localStorage, File, geolocation)
    // Task Queue (Macro) - callbacks, setTimeout CB, setInterval CB, .onClick() CB
    // Micro - Promises (.then, .catch, .finally, async await, fetch .then() )
    // event loop checks and moves task to call stack
    // call stack execute sync first then micro (promises), then macro (settimeout, callbacks)
}

function arrayMethods() {
    const arr: Array<number> = [1,2,3,4,5]

    // for each
    arr.forEach((item, index, array) => {
        item++
        // cant break or continue
        // cant return early
    })
    console.log("after foreach: ", arr)
    // for of
    for (let item of arr) {
        item--
        if (item == 1) {
            break
        }
        // can break
    }
    console.log("after for of: ", arr)
    // for in - iterate over indices, AVOID FOR ARRAYS
    for (let index in arr) {
        console.log(index); // it will be string
    }
    // traditional
    for (let i=0; i<arr.length; i++) {
        if (arr[i] === 1) {
            continue
        }
        console.log("in traditional, skip 1 (ind 0): ", arr[i])
    }

    // map returns new array
    const doubled = arr.map(n => n*2)

    // for each - no returned value
    const result = arr.forEach(n => n * 2)
    console.log(result) // undefined

    // filter - return array of matching items - checks all items
    const filtered = arr.filter(n => n<3)

    // find - return first matching item (or undefined) - stops at first maych
    const three = arr.find(n => n === 3)
    const ten = arr.find(n => n === 10)

    // findIndex - return index of first match, else -1
    const threeIdx = arr.findIndex(n => n === 3)
    
    // every - return true if all match - stops at first non match
    const allLessThanTen = arr.every(n => n < 10)

    // some - return true if some matches - stops at first match
    const somelessThanThree = arr.some(n => n < 3)

    // reduce - sum
    const sum = arr.reduce((acc, curr) => acc + curr, 0)
    // reduce - product
    const product = arr.reduce((acc, curr) => acc*curr, 0)


    /*
    Need to transform all items? → map
    Need all matching items? → filter
    Need first matching item? → find
    Need to check if all match? → every
    Need to check if any match? → some
    Just doing side effects? → forEach
    */
}

main3()