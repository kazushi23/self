package main

import "fmt"

func main() {
	// Implement regular expression match with vocabulary `a-z*.`.
	// But  applies to next character (not previous as usual regex) .
	// `e.g match(‘abbbbcyz’, ‘a*bc.z’) -> True, match(‘abbbbc’, ‘ab*c’) -> False`
	fmt.Println(regularExpression("abb", "abc") == false)            // false
	fmt.Println(regularExpression("abc", "a.c") == true)             // true
	fmt.Println(regularExpression("abd", "a.c") == false)            // false
	fmt.Println(regularExpression("abd", "...") == true)             // true
	fmt.Println(regularExpression("abbbbcyz", "a*bc.z") == true)     // true
	fmt.Println(regularExpression("abbbbcddyz", "a*bc*d.z") == true) // true
	fmt.Println(regularExpression("abbbbcddyz", "a*bc*d") == false)  // false
	fmt.Println(regularExpression("abbbb", "a*bc*d") == false)       // false
	fmt.Println(regularExpression("aaaa", "*a") == true)             // true
	fmt.Println(regularExpression("abc", "*.") == true)              // true
	fmt.Println(regularExpression("abcd", "a*bc") == false)          // false
	fmt.Println(regularExpression("ab", "a*bc") == false)            // false
	fmt.Println(regularExpression("b", "*a") == false)               // false
	fmt.Println(regularExpression("", "") == true)                   // true
	fmt.Println(regularExpression("", "a*") == false)                // false
	fmt.Println(regularExpression("", "*a") == false)                // false
	fmt.Println(regularExpression("aaabbbcc", "*a*b*c") == true)     // true
}

// assumption, * means 1 or more and will not trail with *
func regularExpression(s1, r1 string) bool {
	char := "" // b
	match := 0 //
	i := 0     // s1
	j := 0     // r1
	lenR1 := len(r1) - 1
	lenS1 := len(s1) - 1
	for i <= lenS1 || j <= lenR1 {
		if j > lenR1 || i > lenS1 {
			return false
		}
		if string(r1[j]) == "*" {
			if j+1 > lenR1 {
				return false
			}
			char = string(r1[j+1])
			for i <= lenS1 && (string(s1[i]) == char || char == ".") {
				match++
				i++
			}
			if match == 0 {
				return false
			}
			match = 0
			j++
		} else {
			if i > lenS1 {
				return false
			}
			str := string(s1[i])
			if string(r1[j]) != str && string(r1[j]) != "." {
				return false
			}
			i++
		}
		j++
	}
	return true
}
