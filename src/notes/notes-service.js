const NotesService = {
    getAllNotes(knex){
        return knex
            .select('*')
            .from('notes')
    },
    getNoteById(knex, noteId){
        return knex.select('*').from('notes').where('id', noteId).first()
    },
    getNotesByFolder(knex, folderId){
        return knex
            .from('notes')
            .select('*')
            .where('folder_id', folderId)
    },
    addNote(knex, note){
        return knex
            .insert(note)
            .into('notes')
            .returning('*')
            .then(rows => {
                return rows[0]
            })
    },
    deleteNote(knex, noteId){
        return knex
            .from('notes')
            .where('id', noteId)
            .delete()
    },
    updateNote(knex, noteId, newNote){
        return knex('notes')
            .where('id', noteId)
            .update(newNote)
    }
}

module.exports = NotesService