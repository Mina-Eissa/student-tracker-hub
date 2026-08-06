# Student Tracker Hub

i want to create frontend for tool its purpose to help teacher tracking the student from : 

1- take attendance { with status { present , absent , late( reason field ), excused ( reason field ) } .

2- set behavior { ( type: positive, negative ) , ( tag: noisy , helpful,active ...etc ) , comment ( field ) , consequence ( field ) } each behavior tag have point in minus and plus so i want to create window to create and update tag and set its point and it reflects to scoreboard page that sort students in specific grade by points

3- store bathroom log -> for each student i want to store number of times and each time i want to record time for it 

4- generate report -> window make teacher to choose date and session in this datetime and create pdf report for print it 

i want to create schedule of sessions that display all session for grades assigned for this teacher 

and for admin user i want to make him allowence to set sessions for teachers and assign grades for teachers and upload students in each grade 

in schedule each teacher can choose session and has button to start this session and load list of students

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c4594526-b6af-4a40-aecd-1aaf8a0669e3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
