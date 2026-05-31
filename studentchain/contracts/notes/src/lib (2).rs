#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Env, String, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Student {
    pub id: u64,
    pub name: String,
    pub major: String,
}

const STUDENT_STORE: Symbol = symbol_short!("STUD");

#[contract]
pub struct StudentContract;

#[contractimpl]
impl StudentContract {

    // READ ALL
    pub fn get_students(env: Env) -> Vec<Student> {
        env.storage()
            .instance()
            .get(&STUDENT_STORE)
            .unwrap_or(Vec::new(&env))
    }

    // CREATE
    pub fn create_student(env: Env, name: String, major: String) -> String {

        let mut students: Vec<Student> = env
            .storage()
            .instance()
            .get(&STUDENT_STORE)
            .unwrap_or(Vec::new(&env));

        let student = Student {
            id: env.prng().gen::<u64>(),
            name,
            major,
        };

        students.push_back(student);

        env.storage().instance().set(&STUDENT_STORE, &students);

        String::from_str(&env, "Student berhasil ditambahkan")
    }

    // UPDATE
    pub fn update_student(
        env: Env,
        id: u64,
        name: String,
        major: String,
    ) -> String {

        let mut students: Vec<Student> = env
            .storage()
            .instance()
            .get(&STUDENT_STORE)
            .unwrap_or(Vec::new(&env));

        for i in 0..students.len() {
            let mut s = students.get(i).unwrap();

            if s.id == id {
                s.name = name;
                s.major = major;

                students.set(i, s);

                env.storage().instance().set(&STUDENT_STORE, &students);

                return String::from_str(&env, "Student diupdate");
            }
        }

        String::from_str(&env, "Student tidak ditemukan")
    }

    // DELETE
    pub fn delete_student(env: Env, id: u64) -> String {

        let mut students: Vec<Student> = env
            .storage()
            .instance()
            .get(&STUDENT_STORE)
            .unwrap_or(Vec::new(&env));

        for i in 0..students.len() {
            if students.get(i).unwrap().id == id {
                students.remove(i);

                env.storage().instance().set(&STUDENT_STORE, &students);

                return String::from_str(&env, "Student dihapus");
            }
        }

        String::from_str(&env, "Student tidak ditemukan")
    }

}

mod test;












/* --- CONTOH SCRIPT ---

pub fn get_notes(env: Env) -> Vec<Note> {
    // 1. ambil data notes dari storage
    return env.storage().instance().get(&NOTE_DATA).unwrap_or(Vec::new(&env));
}

// Fungsi untuk membuat note baru
pub fn create_note(env: Env, title: String, content: String) -> String {
    // 1. ambil data notes dari storage
    let mut notes: Vec<Note> = env.storage().instance().get(&NOTE_DATA).unwrap_or(Vec::new(&env));
    
    // 2. Buat object note baru
    let note = Note {
        id: env.prng().gen::<u64>(),
        title: title,
        content: content,
    };
    
    // 3. tambahkan note baru ke notes lama
    notes.push_back(note);
    
    // 4. simpan notes ke storage
    env.storage().instance().set(&NOTE_DATA, &notes);
    
    return String::from_str(&env, "Notes berhasil ditambahkan");
}

// Fungsi untuk menghapus notes berdasarkan id
pub fn delete_note(env: Env, id: u64) -> String {
    // 1. ambil data notes dari storage 
    let mut notes: Vec<Note> = env.storage().instance().get(&NOTE_DATA).unwrap_or(Vec::new(&env));

    // 2. cari index note yang akan dihapus menggunakan perulangan
    for i in 0..notes.len() {
        if notes.get(i).unwrap().id == id {
            notes.remove(i);

            env.storage().instance().set(&NOTE_DATA, &notes);
            return String::from_str(&env, "Berhasil hapus notes");
        }
    }

    return String::from_str(&env, "Notes tidak ditemukan")
}


*/