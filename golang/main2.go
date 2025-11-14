package main

import (
	"fmt"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/shopspring/decimal"
)

func main2() {
	nonDivisibleSubset([]int32{19, 10, 12, 10, 24, 25, 22}, 4)
	repeatedString("abcac", 10)
	jumpingOnClouds([]int32{0, 0, 0, 1, 0, 0})
	superReducedString("aaabccddd")

	num := 22    // num is value
	var ptr *int // ptr is a mem addr
	ptr = &num   // assign mem addr of num to ptr

	fmt.Println(ptr)
	*ptr++
	fmt.Println(ptr)
	// & is to get mem addr
	// * is to store mem addr and dereference mem > val
	test(&num) // num > 24 > original value based on mem
	test2(num) // num > 23 > creates a copy when send over
	fmt.Println(num)

	activityNotifications([]int32{1, 2, 3, 4, 4, 7, 6, 2, 4, 6, 7, 9, 1, 24, 3, 35, 64, 77, 8, 3, 78}, 8)
	concurrentTask()
}

func test(x *int) {
	*x++
}

func test2(x int) {
	x++
}

func concurrentTask() {
	var wg sync.WaitGroup                         // waitgroup
	var mu sync.Mutex                             //mutex for locking
	counter := 0                                  // shared counter
	tasks := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10} // 10 tasks

	sem := make(chan struct{}, 3) // max 3 concurrent task, channel queue where goroutines can send and receive values
	fmt.Println(sem)
	for _, t := range tasks {
		wg.Add(1)
		sem <- struct{}{} // acquire, send an empty struct into the channel. if already 3 values inside, goroutine blocks until a spot is free
		go func(task int) {
			defer wg.Done()
			defer func() { <-sem }() //release, removes a token

			fmt.Println("Starting task X: ", task) // start task

			time.Sleep(1 * time.Second) // sleep 1 second

			mu.Lock() // lock counter
			counter++ // increment counter
			fmt.Println("Finished task X, counter = ", counter)
			mu.Unlock() // unlock counter
		}(t)
	}

	wg.Wait()

	fmt.Println("Finished all task: ", counter)
}

func activityNotifications(expenditure []int32, d int32) int32 {
	// There are only 201 possible expenditure values (0 to 200),
	// so we can use a counting sort array to track frequencies
	const maxVal = 201
	lenExp := len(expenditure)
	alerts := int32(0)

	// counts[v] = how many times value v appears in the trailing window of size d
	counts := make([]int, maxVal)

	// Step 1: Initialize the first window of size `d`
	// We count the frequency of each expenditure value in the first d days
	for i := 0; i < int(d); i++ {
		v := int(expenditure[i])
		counts[v]++
	}

	// Step 2: Iterate from day d to the end
	for i := int(d); i < lenExp; i++ {
		cum := int32(0)
		median := float64(0)

		// Step 3: Find the median based on current frequency counts
		if d%2 == 0 {
			// For even d, median = average of the two middle numbers
			target1 := d / 2       // 1st middle position
			target2 := target1 + 1 // 2nd middle position
			first := -1
			second := -1

			// Iterate over all possible expenditure values (0 to 	200)
			for value, freq := range counts {
				cum += int32(freq) // accumulate the count
				// Find the first middle number
				if first == -1 && cum >= target1 {
					first = value
				}
				// Find the second middle number
				if cum >= target2 {
					second = value
					break // once both found, stop looping
				}
			}
			// Compute median as average of two middle values
			median = (float64(first) + float64(second)) / 2.0

		} else {
			// For odd d, median = the middle number
			target := d/2 + 1
			for value, freq := range counts {
				cum += int32(freq)
				if cum >= target {
					median = float64(value)
					break
				}
			}
		}

		// Step 4: Check if today's expenditure >= 2 × median
		// If yes, raise an alert
		if float64(expenditure[i]) >= 2*median {
			alerts++
		}

		// Step 5: Slide the window:
		// - Remove the oldest day's expenditure (i-d)
		// - Add the current day's expenditure (i)
		oldVal := int(expenditure[i-int(d)])
		newVal := int(expenditure[i])
		counts[oldVal]--
		counts[newVal]++
	}

	// Step 6: Return total alerts triggered
	return alerts
}

// https://www.hackerrank.com/challenges/fraudulent-activity-notifications/problem?isFullScreen=true
func activityNotifications2(expenditure []int32, d int32) int32 {
	expLen := int32(len(expenditure))
	alert := int32(0)
	two := decimal.NewFromInt(2)
	for i := int32(d); i <= expLen-1; i++ {
		tempExp := expenditure[i-d : i]
		slices.Sort(tempExp)
		tempExpLen := len(tempExp)
		var median decimal.Decimal
		if tempExpLen%2 == 0 {
			left := decimal.NewFromInt32(tempExp[(tempExpLen/2)-1])
			right := decimal.NewFromInt32(tempExp[(tempExpLen / 2)])
			median = left.Add(right).Div(two)
		} else {
			midVal := tempExp[tempExpLen/2]
			median = decimal.NewFromInt32(midVal)
		}
		currVal := decimal.NewFromInt32(expenditure[i])
		mul := currVal.Div(median)
		if mul.GreaterThanOrEqual(two) {
			alert++
		}
	}
	return alert
}

// https://www.hackerrank.com/challenges/reduced-string/problem?isFullScreen=true
func superReducedString(s string) string {
	// aaabccddd
	// baab
	// cbaabcdde
	res := "" //
	for _, char := range s {
		if res == "" {
			res = string(char)
		} else {
			lastString := string(res[len(res)-1])
			charS := string(char)
			if charS == lastString {
				res = res[:len(res)-1]
			} else if charS != lastString {
				res += charS
			}
		}
	}
	if res == "" {
		return "Empty String"
	} else {
		return res
	}
}

// https://www.hackerrank.com/challenges/jumping-on-the-clouds/problem?isFullScreen=true
func jumpingOnClouds(c []int32) int32 {
	// 0, 0, 1, 0, 0, 1, 0
	jump := int32(0)
	i := int32(0)
	n := int32(len(c))
	for i < n-1 {
		if i+2 < n && c[i+2] != 1 {
			i += 2
		} else {
			i += 1
		}
		jump++
	}

	return int32(jump)
}

// https://www.hackerrank.com/challenges/repeated-string/problem?isFullScreen=true
func repeatedString(s string, n int64) int64 {
	// "abcac", 10 => len(S) = 7
	lenS := int64(len(s)) // 7
	remainder := n % lenS // 3
	repeat := n / lenS    // 3
	occurrence := strings.Count(s, "a") * int(repeat)

	if remainder > 0 {
		remainderS := s[0:remainder]
		occurrence += strings.Count(remainderS, "a")
	}
	return int64(occurrence)

}

// https://www.hackerrank.com/challenges/non-divisible-subset/problem?isFullScreen=true
func nonDivisibleSubset(s []int32, k int32) int32 {
	// Step 1: Count remainders
	freq := make([]int32, k)
	for _, num := range s {
		remainder := num % k
		freq[remainder]++
	}

	// Step 2: Start with remainder 0 group
	result := int32(0)
	if freq[0] > 0 {
		result = 1
	}

	// Step 3: Handle pairs (r, k - r)
	for r := int32(1); r <= k/2; r++ {
		if r != k-r { // not the middle remainder when k is even
			if freq[r] > freq[k-r] {
				result += freq[r]
			} else {
				result += freq[k-r]
			}
		}
	}

	// Step 4: If k is even, handle the special middle remainder
	if k%2 == 0 && freq[k/2] > 0 {
		result++ // can only add one element from this group
	}

	return result
}
