const supertest = require('supertest')
const app = require('../src/app')
const knex = require('knex')
const makeFoldersArray = require('./folders.fixtures')
const makeNotesArray = require('./notes.fixtures')
const foldersRouter = require('../src/folders/folders-router')
const { expect } = require('chai')

let db
  
before('make knex instance', () => {
  db = knex({
    client: 'pg',
    connection: process.env.TEST_DB_URL,
  })
  app.set('db', db)
})
after('disconnect from db', () => db.destroy())
before('clean the table', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))
afterEach('cleanup',() => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

describe('Folders endpoints', () => {
  describe('GET /api/folders endpoint', () => {
    context('Given no data in folders table', () => {
      it('Returns an empty array', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, [])
      })
    })
    context('Given data in folders table', () => {
      const foldersArray = makeFoldersArray()
      beforeEach('Seed folders table', () => {
        return db.insert(foldersArray).into('folders')
      })
      it('Returns the folders list', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, foldersArray)
      })
    })
    context('Given an xss attack folder', () => {
      //need to add xss test
    })
  })
  describe('POST /api/folders endpoint', () => {
    it('Returns 400 if folder_name is not supplied', () => {
      return supertest(app)
        .post('/api/folders')
        .send({})
        .expect(400, {
          error: {message: "Invalid data."}
        })
    })
    it('Adds folder and returns location and folder', () => {
      const foldersArray = makeFoldersArray()
      const folder = foldersArray[0]
      return supertest(app)
        .post('/api/folders')
        .send({
          "folder_name": folder.folder_name,
          "modified": folder.modified
        })
        .expect(201)
        .expect(res => {
          expect(res.body).to.eql(folder)
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
        })
    })
    context('Given an xss attack folder', () => {
      //need to add xss test
    })
  })
  describe('GET /api/folder/folderId endpoint', () => {
    it('Returns 404 not found if the folder does not exist', () => {
      return supertest(app)
        .get('/api/folders/10')
        .expect(404, {
          error: {message: "Folder does not exist."}
        })
    })
    context('Given that folders exist', () => {
      const foldersArray = makeFoldersArray()
      beforeEach('Seed folders table', () => {
        return db.insert(foldersArray).into('folders')
      })
      it('Returns the folder if it does exist', () => {
        return supertest(app)
          .get('/api/folders/2')
          .expect(200, foldersArray[1])
      })
    })
    context('Given an xss attack folder', () => {
      //need to add xss test
    })
  })
  describe('PATCH /api/folder/folderId endpoint', () => {
    context('Given that folder does not exist', () =>{
      it('Returns 404', () => {
        return supertest(app)
          .patch('/api/folders/25')
          .expect(404, {
            error: {message: "Folder does not exist."}
          })
      })
    })
    context('Given that folder does exist', () => {
      const foldersArray = makeFoldersArray()
      const newFolder = {
        "folder_name": "Things and Stuff"
      }
      const expectedFolder = {
        id: foldersArray[2].id,
        folder_name: newFolder.folder_name,
        modified: foldersArray[2].modified
      }
      beforeEach('Seed folders table', () => {
        return db.insert(foldersArray).into('folders')
      })
      it('Returns 400 if no fields are updated', () => {
        return supertest(app)
          .patch('/api/folders/3')
          .send({})
          .expect(400, {
            error: {message: "Invalid data, must update folder_name or modified."}
          })
      })
      it('Updates the folder and returns 204', () => {
        return supertest(app)
          .patch('/api/folders/3')
          .send(newFolder)
          .expect(204)
          .then(() => (
            supertest(app)
              .get('/api/folders/3')
              .expect(200, expectedFolder)
          ))
      })
    })
    context('Given an xss attack folder', () => {
      //need to add xss test
    })
  })
  describe('DELETE /api/folder/folderId endpoint', () => {
    context('Given that folder does not exist', () =>{
      it('Returns 404', () => {
        return supertest(app)
          .delete('/api/folders/25')
          .expect(404, {
            error: {message: "Folder does not exist."}
          })
      })
    })
    context('Given that folder does exist', () => {
      const foldersArray = makeFoldersArray()
      const expectedFolders = [foldersArray[0], foldersArray[2]]
      beforeEach('Seed folders table', () => {
        return db.insert(foldersArray).into('folders')
      })
      it('Should delete the folder and return 201', () => {
        return supertest(app)
          .delete('/api/folders/2')
          .expect(201)
          .then(() => 
            supertest(app)
              .get('/api/folders')
              .expect(200, expectedFolders)
          )
      })
    })
  })
})
describe('Notes endpoints', ()=> {
  describe('GET /api/notes endpoint', () => {
    context('Given no data in notes table', () => {
      it('Returns an empty array', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, [])
      })
    })
    context('Given data in notes array', () => {
      const notesArray = makeNotesArray()
      const foldersArray = makeFoldersArray()
      beforeEach('Seed notes table', () => {
        return db
          .insert(foldersArray)
          .into('folders')
          .then(() => {
            return db
            .insert(notesArray)
            .into('notes')
          })
      })
      it('Returns the notes array', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, notesArray)
      })
    })
    context('Given an xss attack note', () => {
      //it('Sanitizes the xss content', () => {
       
      //})
    })
  })
  describe('POST /api/notes endpoint', () => {
    const requiredFields = ['note_name', 'folder_id']
    const newNote = makeNotesArray()[0]
    requiredFields.forEach(field => {
      const newNote = {
        note_name: "Note name",
        folder_id: "folder_id"
      }
      it(`Returns 400 if ${field} is missing`, () => {
        delete newNote[field]
        return supertest(app)
          .post('/api/notes')
          .send(newNote)
          .expect(400, {
            error: {message: "Invalid data."}
          }) 
      })
    })
    context('Given folders data in table', () => {
      const foldersArray = makeFoldersArray()
      beforeEach('Seed folders table', () => {
        return db.insert(foldersArray).into('folders')
      })
      it('Returns 400 if folder_id is not valid', () => {
        return supertest(app)
          .post('/api/notes')
          .send({"note_name": "note Name", "folder_id": 58})
          .expect(400, {
            error: {message: "Folder_id is not valid."}
          })
      })
      it('Should post note and return 201', () => {
        return supertest(app)
          .post('/api/notes')
          .send(newNote)
          .expect(201)
          .expect(res => {
            expect(res.body).to.eql(newNote)
            expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`)
          })
      })
      context('Given an xss attack note', () => {
        //need xss test
      })
    })
  })
  describe('GET /api/notes/:noteId endpoint', () => {
    context('Given that note does not exist', () => {
      it('Returns 404', () => {
        return supertest(app)
          .get('/api/notes/25')
          .expect(404, {
            error: {message: "Note does not exist."}
          })
      })
    })
    context('Given that note does exist', () => {
      const notesArray = makeNotesArray()
      const foldersArray = makeFoldersArray()
      beforeEach('Seed notes table', () => {
        return db
          .insert(foldersArray)
          .into('folders')
          .then(() => {
            return db
            .insert(notesArray)
            .into('notes')
          })
      })
      it('Returns the note', () => {
        return supertest(app)
          .get('/api/notes/1')
          .expect(200, notesArray[0])
      })
    })
    context('Given an xss attack note', () => {
      //need xss test
    })
  })
  describe('GET /api/notes/from-folder/:folderId endpoint', () => {
    context('Given that the folder does not exist', () =>{
      it('Returns 404', () => {
        return supertest(app)
          .get('/api/notes/from-folder/15')
          .expect(404, {
            error: {message: "Folder does not exist."}
          })
      })
    })
    context('Given that the folder has no notes', () => {
      beforeEach('Seed an empty folder', () => {
        return db.insert({folder_name: "Folder"}).into('folders')
      })
      it('Returns 200 with an empty array', () => {
        return supertest(app)
          .get('/api/notes/from-folder/1')
          .expect(200, [])
      })
    })
    context('Given that the folder has notes', () => {
      const notesArray = makeNotesArray()
      const foldersArray = makeFoldersArray()
      const expectedNotes = notesArray.filter(note => {
        return note.folder_id == 3
      })
      beforeEach('Seed notes table', () => {
        return db
          .insert(foldersArray)
          .into('folders')
          .then(() => {
            return db
            .insert(notesArray)
            .into('notes')
          })
      })
      it('Returns the correct array of notes', () => {
        return supertest(app)
          .get('/api/notes/from-folder/3')
          .expect(200, expectedNotes)
      })
    })
    context('Given an xss attack note', () => {

    })
  })
  describe('PATCH /api/notes/:noteId endpoint', () => {
    context('Given the note does not exist', () => {
      it('Returns 404', () => {
        return supertest(app)
          .patch('/api/notes/45')
          .send({})
          .expect(404, {
            error: {message: "Note does not exist."}
          })
      })
    })
    context('Given that the note does exist', () => {
      const notesArray = makeNotesArray()
      const foldersArray = makeFoldersArray()
      const newNote = {
        id: 3,
        note_name: 'Updated Title',
        modified: '2020-11-17T18:29:03.180Z',
        content: 'Content Content Content',
        folder_id: 1
      }
      beforeEach('Seed notes table', () => {
        return db
          .insert(foldersArray)
          .into('folders')
          .then(() => {
            return db
            .insert(notesArray)
            .into('notes')
          })
      })
      it('Returns 400 if no updates are made', () => {
        return supertest(app)
          .patch('/api/notes/3')
          .send({})
          .expect(400, {
            error: {message: "Invalid data, must update at least 1 field."}
          })
      }) 
      it('Updates note and returns 204', () => {
         return supertest(app)
          .patch('/api/notes/3')
          .send(newNote)
          .expect(204)
          .then(response => {
              return supertest(app)
              .get('/api/notes/3')
              .expect(newNote)
          })
      })
    })
  })
  describe('DELETE /api/notes/:noteId endpoint', () => {
    context('Given that the note does not exist', () => {
      it('Returns 404', () => {
        return supertest(app)
          .delete('/api/notes/38')
          .expect(404, {
            error: {message: "Note does not exist."}
          })
      })
    })
    context('Given that the note does exist', () => {
      const foldersArray = makeFoldersArray()
      const notesArray = makeNotesArray()
      const expectedNotes = notesArray.filter(note => note.id !== 1)
      beforeEach('Seed notes table', () => {
        return db
          .insert(foldersArray)
          .into('folders')
          .then(() => {
            return db
            .insert(notesArray)
            .into('notes')
          })
      })
      it('Deletes note and returns 204', () => {
        return supertest(app)
          .delete('/api/notes/1')
          .expect(201)
          .then(() => {
            return supertest(app)
              .get('/api/notes')
              .expect(200, expectedNotes)
          })
      })
    })
  })
})


