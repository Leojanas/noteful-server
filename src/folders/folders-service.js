const FoldersService = {
    getAllFolders(knex){
        return knex
            .select('*')
            .from('folders')
    },
    getFolderById(knex, folderId){
        return knex.select('*').from('folders').where('id', folderId).first()
    },
    addFolder(knex, folder){
        return knex
            .insert(folder)
            .into('folders')
            .returning('*')
            .then(rows => {
                return rows[0]
            })
    },
    deleteFolder(knex, folderId){
        return knex
            .from('folders')
            .where('id', folderId)
            .delete()
    },
    updateFolder(knex,folderId, newFolder){
        return knex('folders')
            .where('id', folderId)
            .update(newFolder)
    }
}

module.exports = FoldersService