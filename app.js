const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

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
    await db.exec(`
      CREATE TABLE IF NOT EXISTS todo (
        id INTEGER PRIMARY KEY,
        todo TEXT NOT NULL,
        priority TEXT CHECK(priority IN ('HIGH', 'MEDIUM', 'LOW')),
        status TEXT CHECK(status IN ('TO DO', 'IN PROGRESS', 'DONE'))
      );
    `)
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const hasPriorityAndStatusProperties = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

// API 1
app.get('/todos/', async (request, response) => {
  let data = null
  let getTodosQuery = ''
  const {search_q = '', priority, status} = request.query

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
        SELECT * FROM todo
        WHERE todo LIKE '%${search_q}%'
          AND status = '${status}'
          AND priority = '${priority}';
      `
      break

    case hasPriorityProperty(request.query):
      getTodosQuery = `
        SELECT * FROM todo
        WHERE todo LIKE '%${search_q}%'
          AND priority = '${priority}';
      `
      break

    case hasStatusProperty(request.query):
      getTodosQuery = `
        SELECT * FROM todo
        WHERE todo LIKE '%${search_q}%'
          AND status = '${status}';
      `
      break

    default:
      getTodosQuery = `
        SELECT * FROM todo
        WHERE todo LIKE '%${search_q}%';
      `
  }

  data = await db.all(getTodosQuery)
  response.send(data)
})

// API 2
app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getTodoQuery = `
    SELECT * FROM todo
    WHERE id = ${todoId};
  `

  const todo = await db.get(getTodoQuery)
  response.send(todo)
})

// API 3
app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status} = request.body
  const postTodoQuery = `
    INSERT INTO todo (id, todo, priority, status)
    VALUES (${id}, '${todo}', '${priority}', '${status}');
  `
  await db.run(postTodoQuery)
  response.send('Todo Successfully Added')
})

// API 4
app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const requestBody = request.body
  let responseMessage = ''

  // Check which property is being updated and build the update query accordingly
  if (requestBody.status !== undefined) {
    const updateStatusQuery = `
      UPDATE todo
      SET status = '${requestBody.status}'
      WHERE id = ${todoId};
    `
    await db.run(updateStatusQuery)
    responseMessage = 'Status Updated'
  } else if (requestBody.priority !== undefined) {
    const updatePriorityQuery = `
      UPDATE todo
      SET priority = '${requestBody.priority}'
      WHERE id = ${todoId};
    `
    await db.run(updatePriorityQuery)
    responseMessage = 'Priority Updated'
  } else if (requestBody.todo !== undefined) {
    const updateTodoQuery = `
      UPDATE todo
      SET todo = '${requestBody.todo}'
      WHERE id = ${todoId};
    `
    await db.run(updateTodoQuery)
    responseMessage = 'Todo Updated'
  }

  response.send(responseMessage)
})

// API 5
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};
  `
  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app
