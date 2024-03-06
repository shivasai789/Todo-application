const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path = require('path')

const format = require('date-fns/format')
const isValid = require('date-fns/isValid')
const toDate = require('date-fns/toDate')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'todoApplication.db')

let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running...')
    })
  } catch (e) {
    console.log(`DB ERROR: ${e.message}`)
    process.exit(0)
  }
}

initializeDbAndServer()

//Get todos API
app.get('/todos/', async (request, response) => {
  let getTodoQuery = ''

  const {status, priority, search_q = '', category} = request.query

  const statusProporties = request => {
    return request.status !== undefined
  }

  const priorityProporties = request => {
    return request.priority !== undefined
  }

  const statusPriorityProperties = request => {
    return (request.status !== undefined) & (request.priority !== undefined)
  }

  const searchProperties = request => {
    return request.search_q !== undefined
  }

  const categoryStatusProperties = request => {
    return request.category !== undefined && request.status !== undefined
  }

  const categoryProperties = request => {
    return request.category !== undefined
  }

  const categoryPriorityProperties = request => {
    return request.category !== undefined && request.priority !== undefined
  }

  switch (true) {
    case statusProporties(request.query):
      getTodoQuery = `
      SELECT 
        *
      FROM 
        todo 
      WHERE status = "${status}"
      AND todo LIKE "%${search_q}%";`
      break
    case priorityProporties(request.query):
      getTodoQuery = `
      SELECT 
        *
      FROM 
        todo 
      WHERE 
        todo LIKE "%${search_q}%"
        AND priority = "${priority}";`
      break
    case statusPriorityProperties(request.query):
      getTodoQuery = `
      SELECT 
        *
      FROM 
        todo 
      WHERE 
        todo LIKE "%${search_q}%"
        AND priority = "${priority}"
        AND status = "${status}";`
      break
    case searchProperties(request.query):
      getTodoQuery = `
      SELECT 
        *
      FROM 
        todo 
      WHERE 
        todo LIKE "%${search_q}%";`
      break
    case categoryStatusProperties(request.query):
      getTodoQuery = `
      SELECT 
        *
      FROM 
        todo 
      WHERE 
        todo LIKE "%${search_q}%"
        AND category = "${category}"
        AND status = "${status}";`
      break
    case categoryProperties(request.query):
      getTodoQuery = `
      SELECT 
        *
      FROM 
        todo 
      WHERE 
        todo LIKE "%${search_q}%"
        AND category = "${category}";`
      break
    case categoryPriorityProperties(request.query):
      getTodoQuery = `
      SELECT 
        *
      FROM 
        todo 
      WHERE 
        todo LIKE "%${search_q}%"
        AND priority = "${priority}"
        AND category = "${category}";`
      break
    default:
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%';`
  }
  const todoArr = await db.all(getTodoQuery)
  response.send(todoArr)
})

//Get todo API
app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const todoIdQuery = `
  SELECT 
    * 
  FROM 
    todo 
  WHERE 
    id = ${todoId};`
  const todo = await db.get(todoIdQuery)
  response.send(todo)
})

//Get agenda API
app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  let formatedDate = ''
  if (date !== undefined) {
    try {
      const myDate = new Date(date)
      console.log(myDate)
      formatedDate = format(new Date(date), 'yyyy-MM-dd')
      console.log(formatedDate, 'f')
      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${
            myDate.getMonth() + 1
          }-${myDate.getDate()}`,
        ),
      )
      console.log(result, 'r')
      console.log(new Date(), 'new')

      const isValidDate = await isValid(result)
      console.log(isValidDate, 'V')
      if (isValidDate === true) {
        request.date = formatedDate
      } else {
        response.status(400)
        response.send('Invalid Due Date')
        return
      }
    } catch (e) {
      response.status(400)
      response.send('Invalid Due Date')
      return
    }
  }
  const agendaQuery = `
  SELECT
    id,
    todo,
    priority,
    status,
    category,
    due_date as dueDate
  FROM
    todo
  WHERE
    due_Date = "${formatedDate}";`

  const todo = await db.all(agendaQuery)
  if (todo === undefined) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    response.send(todo)
  }
})

//Create todo API
app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  const postTodoQuery = `
  INSERT INTO 
    todo 
  VALUES(
    ${id},
    "${todo}",
    "${priority}",
    "${status}",
    "${category}",
    "${dueDate}"
  );`
  await db.run(postTodoQuery)
  response.send('Todo Successfully Added')
})

//Update todo API
app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  let tp = ''
  let getTodoQuery = ''
  const {status, priority, todo, category, dueDate} = request.body
  switch (true) {
    case status !== undefined:
      tp = 'Status'
      getTodoQuery = `
      UPDATE 
        todo
      SET
        status = "${status}"
      WHERE 
        id = ${todoId};`
      break
    case priority !== undefined:
      tp = 'Priority'
      getTodoQuery = `
      UPDATE 
        todo
      SET
        priority = "${priority}"
      WHERE 
        id = ${todoId};`
      break
    case todo !== undefined:
      tp = 'Todo'
      getTodoQuery = `
      UPDATE 
        todo
      SET
        todo = "${todo}"
      WHERE 
        id = ${todoId};`
      break
    case category !== undefined:
      tp = 'Category'
      getTodoQuery = `
      UPDATE 
        todo
      SET
        category = "${category}"
      WHERE 
        id = ${todoId};`
      break
    case dueDate !== undefined:
      tp = 'Due Date'
      getTodoQuery = `
      UPDATE 
        todo
      SET
        due_date = "${dueDate}"
      WHERE 
        id = ${todoId};`
      break
  }
  await db.run(getTodoQuery)
  response.send(`${tp} Updated`)
})

//Delete todo API
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
  DELETE FROM
    todo 
  WHERE 
    id = ${todoId};`
  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app
