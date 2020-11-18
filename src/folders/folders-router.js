const express = require('express')
const xss = require('xss')
const FoldersService = require('./folders-service')
const path = require('path')

const foldersRouter = express.Router()
const jsonParser = express.json()

const sanitizeFolder = folder => ({
    id: folder.id,
    folder_name: xss(folder.folder_name),
    modified: folder.modified
})

foldersRouter
    .route('/')
    .get((req, res, next) => {
        FoldersService.getAllFolders(req.app.get('db'))
            .then(folders => {
                res.json(folders.map(sanitizeFolder))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const {folder_name, modified} = req.body
        if(!folder_name){
            return res.status(400).json({
                error: {message: "Invalid data."}
            })
        }
        const newFolder = {folder_name, modified}
        FoldersService.addFolder(req.app.get('db'), newFolder)
            .then(folder => {
                res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${folder.id}`))
                .json(sanitizeFolder(folder))
            })
            .catch(next)
    })
foldersRouter
    .route('/:folderId')
    .all((req, res, next) => {
        FoldersService.getFolderById(req.app.get('db'), req.params.folderId)
            .then(folder => {
                if(!folder){
                    return res.status(404).json({
                        error: {message: "Folder does not exist."}
                    })
                }
                res.folder = folder
                next()
            })
            .catch(next)
    })
    .get((req,res,next) => {
        res.json(sanitizeFolder(res.folder))
    })
    .patch(jsonParser, (req,res,next) => {
        const {folder_name, modified} = req.body
        const newFolder = {folder_name, modified}
        const numberOfFields = Object.values(newFolder).filter(Boolean).length
        if(numberOfFields == 0){
            return res.status(400).json({
                error: {message: "Invalid data, must update folder_name or modified."}
            })
        }
        const {folderId} = req.params
        FoldersService.updateFolder(req.app.get('db'),folderId, newFolder)
            .then(folder => {
                res.status(204).json(sanitizeFolder(folder))
            })
            .catch(next)
    })
    .delete((req,res,next)=> {
        FoldersService.deleteFolder(req.app.get('db'), res.folder.id)
            .then(() => {
                res.status(201).end()
            })
    })



module.exports = foldersRouter