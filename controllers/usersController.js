const { db, dbQuery } = require('../supports/database');
const { hashPassword, createToken } = require('../supports/jwt');
const { transporter } = require('../supports/nodemailer');
const { uploader } = require('../supports/uploader');

module.exports = {
    getData: (req, res, next) => {
        dbQuery(`SELECT * FROM user`,
            (err, results) => {
                if (err) {
                    console.log(err)
                    res.status(400).send(err)
                };
                res.status(200).send(results)
            })
    },
    register: async (req, res) => {
        try {
            let { idrole, idstatus, email, username, password, phone, profile_image } = req.body
            let insertSQL = `INSERT INTO user (iduser, idrole, idstatus, idaddress, email, username, password, phone, profile_image) VALUES
                (null,
                ${idrole},
                ${idstatus},
                0,
                ${db.escape(email)},
                ${db.escape(username)},
                ${db.escape(hashPassword(password))},
                ${db.escape(phone)},
                ${db.escape(profile_image)});`

            let getSQL = `SELECT * FROM user WHERE email=${db.escape(email)};`
            let checkEmail = await dbQuery(getSQL);
            if (checkEmail.length > 0) {
                res.status(400).send({
                    success: true,
                    message: "Email Exist ⚠",
                    error: ""
                });
            } else {
                let insertUser = await dbQuery(insertSQL);
                if (insertUser.insertId) {
                    let getUser = await dbQuery(`SELECT * FROM user WHERE iduser=${insertUser.insertId};`)
                    let { iduser, username, email, role, status } = getUser[0];
                    let token = createToken({ iduser, username, email, role, status })
                    await transporter.sendMail({
                        from: "Admin Pharma",
                        to: `${email}`,
                        subject: "Confirm Registration",
                        html: `<div>
                        <h3>Klik Link dibawah ini untuk verifikasi akun anda</h3>
                        <a href='http://localhost:3000/verification/${token}'>Click, Here</a>
                        </div>`
                    })
                    res.status(200).send({
                        success: true,
                        message: "Register Succes ✅",
                        error: ""
                    })
                }
            }
        } catch (error) {
            console.log(error)
            res.status(500).send({
                success: true,
                message: "Failed ❌",
                error: ""
            });
        }
    },
    login: (req, res) => {
        let { email, password } = req.body
        let loginScript = `SELECT * FROM user WHERE email=${db.escape(email)} AND password=${db.escape(hashPassword(password))};`
        db.query(loginScript, (err, results) => {
            if (err) {
                console.log(err)
                res.status(500).send({
                    success: true,
                    message: "Failed ❌",
                    error: err
                })
            };

            if (results.length > 0) {
                let { iduser, idrole, idstatus, idaddress, email, username, fullname, password, age, gender, phone, profile_image } = results[0]
                let token = createToken({ iduser, idrole, idstatus, email, username })
                res.status(200).send({
                    success: true,
                    message: "Login Success ✅",
                    dataLogin: { iduser, idrole, idstatus, idaddress, email, username, fullname, password, age, gender, phone, profile_image, token }
                })
            } else {
                res.status(401).send({
                    success: false,
                    message: "Login Failed ❌",
                    error: ""
                })
            }
        })
    },
    keepLogin: (req, res) => {
        console.log("req.dataUser keepLogin ", req.dataUser)
        let keepLoginScript = `SELECT * FROM user WHERE iduser=${db.escape(req.dataUser.iduser)};`
        db.query(keepLoginScript, (err, results) => {
            if (err) {
                res.status(500).send({
                    success: false,
                    message: "Failed ❌",
                    error: err
                })
            };
            console.log("results = ", results[0])
            if (results.length > 0) {
                let { iduser, idrole, idstatus, idaddress, email, username, fullname, password, age, gender, phone, profile_image } = results[0]
                let token = createToken({ iduser, username, email, idrole, idstatus })
                res.status(200).send({
                    success: true,
                    message: "Login Success ✅",
                    dataLogin: { iduser, idrole, idstatus, idaddress, email, username, fullname, password, age, gender, phone, profile_image, token },
                    error: ""
                })
            } else {
                res.status(401).send({
                    success: false,
                    message: "Login Failed ❌",
                    dataLogin: {},
                    error: ""
                })
            }
        })
    },
    verification: async (req, res) => {
        try {
            if (req.dataUser.iduser) {
                await dbQuery(`UPDATE user SET idstatus=2 WHERE iduser=${db.escape(req.dataUser.iduser)};`);
                let login = await dbQuery(`SELECT * FROM user WHERE iduser=${db.escape(req.dataUser.iduser)};`);
                if (login.length > 0) {
                    let { iduser, username, email, password, role, status } = login[0];
                    let token = createToken({ iduser, username, email, role, status });
                    res.status(200).send({
                        success: true,
                        message: "Login Success ✅",
                        dataVerify: { username, email, role, status, token },
                        error: ""
                    })
                }
            } else {
                res.status(401).send({
                    success: false,
                    message: "Verify Failed ❌",
                    dataVerify: {},
                    err: ''
                })
            }
        } catch (error) {
            console.log(error)
            res.status(500).send({
                success: false,
                message: "Verify Failed :x:",
                err: ''
            })
        }
    },
    changePass: async (req, res) => {
        try {
            await dbQuery(`UPDATE user SET password=${db.escape(hashPassword(req.body.newPassword))} WHERE iduser=${db.escape(req.dataUser.iduser)};`);
            res.status(200).send({
                success: true,
                message: "Change Password Success ✅",
                error: ""
            })
        } catch (error) {
            console.log(error)
            res.status(401).send({
                success: false,
                message: "Change Password Failed ❌",
                dataVerify: {},
                err: ''
            })
        }
    },
    forgot: async (req, res) => {
        try {
            console.log("req.body.email ", req.body)
            let getSQL = await dbQuery(`SELECT * FROM user WHERE email=${db.escape(req.body.email)};`)
            let { iduser, idrole, idstatus, username, email } = getSQL[0]
            let token = createToken({ iduser, idrole, idstatus, username, email })
            console.log("getSQL ", getSQL[0])
            await transporter.sendMail({
                from: "Admin Pharma",
                to: "reyhanbalthazarepsa@gmail.com",
                subject: "Reset Password",
                html: `<div>
                        <h3>Klik Link dibawah ini untuk Reset Password anda</h3>
                        <a href='http://localhost:3000/resetpassword/${token}'>Click, Here to Reset Password</a>
                        </div>`
            })
            res.status(200).send({
                success: true,
                message: "Send Success ✅",
                error: ""
            })
        } catch (error) {
            console.log(error)
            res.status(400).send({
                success: true,
                message: "Email not Exist ❌",
                error: ""
            });
        }
    },
    newPassword: async (req, res) => {
        console.log("req.dataUser newPassword ", req.dataUser)
        try {
            if (req.dataUser.iduser) {
                await dbQuery(`UPDATE user SET password=${db.escape(hashPassword(req.body.password))} WHERE iduser=${req.dataUser.iduser}`)
                let login = await dbQuery(`SELECT * FROM user WHERE iduser=${db.escape(req.dataUser.iduser)};`);
                if (login.length > 0) {
                    let { iduser, username, email, password, idrole, idstatus } = login[0];
                    let token = createToken({ iduser, username, email, idrole, idstatus });
                    res.status(200).send({
                        success: true,
                        message: "Update Success ✅",
                        dataReset: { username, email, idrole, idstatus, iduser, token },
                        error: ""
                    })
                }
            }
        } catch (error) {
            console.log(error)
            res.status(500).send({
                success: false,
                message: "Change Password Failed ❌",
                err: ''
            })
        }
    },
    editProfile: async (req, res) => {
        try {
            const uploadFile = uploader("/imgUser", "IMGUSER").array("images", 1);
            uploadFile(req, res, async (error) => {
                console.log("file", req.files)
                console.log("req.body", req.body.dataBaru)
                let { username, fullname, email, phone, gender, age, url } = JSON.parse(req.body.dataBaru)
                let editProfile = await dbQuery(`UPDATE user SET 
                        username = ${db.escape(username)},
                        fullname = ${db.escape(fullname)},
                        email = ${db.escape(email)},
                        phone = ${db.escape(phone)},
                        
                        gender = ${db.escape(gender)},
                        age = ${db.escape(age)},
                        profile_image = ${req.files[0] ?
                        db.escape(`/imgUser/${req.files[0].filename}`)
                        :
                        db.escape(url)
                    }
                        WHERE iduser = ${req.params.iduser};`)
                console.log("editProfile = ", editProfile)
                res.status(200).send({
                    success: true,
                    message: "edit success ✅"
                })
            })
        } catch (error) {
            console.log(error)
            res.status(500).send({
                success: false,
                message: "Failed ❌",
                error: error
            })
        }
    },
    newAddress: async (req, res) => {
        try {
            console.log("req.body", req.body)
            let { iduser, address } = req.body
            let insertSQL = `INSERT INTO address (idaddress, iduser, address) VALUES
                (null,
                ${iduser},
                ${db.escape(address)});`
            console.log(insertSQL)
            await dbQuery(insertSQL)
            res.status(200).send({
                success: true,
                message: "Add New Address Success ✅",
                error: ""
            })
        } catch (error) {
            console.log(error)
            res.status(500).send({
                success: false,
                message: "Insert New Address Failed ❌",
                err: ''
            })
        }
    },
    getAddress: async (req, res) => {
        try {
            console.log("req.dataUser getAddress ", req.dataUser)
            let getAddress = await dbQuery(`SELECT * FROM address WHERE iduser=${db.escape(req.dataUser.iduser)};`)
            res.status(200).send({
                success: true,
                address: getAddress,
                message: 'Get Address Success'
            });
        } catch (error) {
            console.log('Get Address failed', error)
            res.status(500).send({
                success: failed,
                message: 'Get Address error',
                error
            });
        }
    },
    deleteAddress: async (req, res) => {
        try {
            await dbQuery(`DELETE FROM address WHERE idaddress=${req.params.id}`)
            res.status(200).send({
                success: true,
                message: "Delete Address success ✅",
                error: ''
            })
        } catch (error) {
            console.log(error)
            res.status(500).send({
                success: false,
                message: "Delete Address Failed❌",
                error
            })
        }
    },
    chooseAddress: async (req, res) => {
        try {
            console.log("req.body chooseAddress", req.body)
            console.log("req.params", req.params)
            let { idaddress } = req.body
            await dbQuery(`UPDATE user SET idaddress = ${db.escape(idaddress)} WHERE iduser = ${req.params.id};`)
            res.status(200).send({
                success: true,
                message: "Choose Address success ✅",
                error: ''
            })
        } catch (error) {
            console.log(error)
            res.status(500).send({
                success: false,
                message: "Choose Address Failed❌",
                error
            })
        }
    }
}