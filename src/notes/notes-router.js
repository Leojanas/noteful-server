const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service')
const FoldersService = require('../folders/folders-service')
const path = require('path')

const notesRouter = express.Router()
const jsonParser = express.json()

const sanitizeNote = note => ({
    id: note.id,
    note_name: xss(note.note_name),
    modified: note.modified,
    content: xss(note.content),
    folder_id: note.folder_id
})

notesRouter
    .route('/')
    .get((req, res, next) => {
        NotesService.getAllNotes(req.app.get('db'))
            .then(notes => {
                res.json(notes.map(sanitizeNote))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const {note_name, modified, content, folder_id} = req.body
        if(!note_name || !folder_id){
            return res.status(400).json({
                error: {message: "Invalid data."}
            })
        }
        FoldersService.getFolderById(req.app.get('db'), folder_id)
            .then(folder => {
                if(!folder){
                    return res.status(400).json({
                        error: {message: "Folder_id is not valid."}
                    })
                }
                const newNote = {note_name, modified, content, folder_id}
                NotesService.addNote(req.app.get('db'), newNote)
                    .then(note => {
                        res
                        .status(201)
                        .location(path.posix.join(req.originalUrl, `/${note.id}`))
                        .json(sanitizeNote(note))
                    })
                    .catch(next)
            })
    })
notesRouter
    .route('/:noteId')
    .all((req, res, next) => {
        NotesService.getNoteById(req.app.get('db'), req.params.noteId)
            .then(note => {
                if(!note){
                    return res.status(404).json({
                        error: {message: "Note does not exist."}
                    })
                }
                res.note = note
                next()
            })
            .catch(next)
    })
    .get((req,res,next) => 
        res.json(sanitizeNote(res.note))
    )
    .patch(jsonParser, (req,res,next) => {
        const {note_name, modified, content, folder_id} = req.body
        const newNote = {note_name, modified, folder_id, content}
        const numberOfFields = Object.values(newNote).filter(Boolean).length
        if(numberOfFields == 0){
            return res.status(400).json({
                error: {message: "Invalid data, must update at least 1 field."}
            })
        }
        const {noteId} = req.params
        NotesService.updateNote(req.app.get('db'),noteId, newNote)
            .then(note => 
                res.status(204).json(sanitizeNote(note))
            )
            .catch(next)
    })
    .delete((req,res,next)=> {
        NotesService.deleteNote(req.app.get('db'), req.params.noteId)
            .then(() => {
                res.status(201).end()
            })
    })
notesRouter
    .route('/from-folder/:folderId')
    .get((req,res,next) => {
        const {folderId} = req.params
        FoldersService.getFolderById(req.app.get('db'), folderId)
            .then(folder => {
                if(!folder){
                    return res.status(404).json({
                        error: {message: "Folder does not exist."}
                    })
                }
                NotesService.getNotesByFolder(req.app.get('db'), folderId)
                .then(notes => res.status(200).json(notes.map(sanitizeNote)))
                .catch(next)
            })
            .catch(next)

    })



module.exports = notesRouter