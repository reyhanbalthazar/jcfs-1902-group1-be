const router = require('express').Router();
const {productController} = require('../controllers');

router.get('/',productController.getProduct);
router.get('/category',productController.getCategory);
router.post('/addproduct',productController.addProduct);
router.delete('/:id',productController.deleteProduct);

module.exports=router;