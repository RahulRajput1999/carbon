var express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongo = require('mongoose');
const multer = require('multer');
var DIR = './uploads/';
var router = express.Router();

var upload = multer({ dest: DIR });
/* MongoDB schemas */
const counterSchema = mongo.Schema({
    number: Number,
    engaged: Boolean,
});
const Counter = mongo.model("Counter", counterSchema);
const customerSchema = mongo.Schema({
    name: String,
    email: String,
    phone: String,
    itemIDS: [String],
});
const Customer = mongo.model("Customer", customerSchema);

const customerCounterSchema = mongo.Schema({
    customerID: String,
    counterID: String,
});
const CustomerCounter = mongo.model("CustomerCounter", customerCounterSchema);

const productSchema = mongo.Schema({
    Name: String,
    Brand: String,
    Price: Number,
    Details: String,
    Barcode: String,
    Quantity: Number,
});
const Product = mongo.model("Product", productSchema);

const counterSessionSchema = mongo.Schema({
    counterID: String,
});
const CounterSession = mongo.model("CounterSession", counterSessionSchema);
/* MongoDB connection */
const promise = mongo.connect('mongodb://localhost:27017/carbon', { useNewUrlParser: true });
router.use(cors({ credential: true }));
router.use(cookieParser());
router.use(bodyParser.json());

router.get('/test', function (req, res) {
    res.write('Wow !!! Test succeeded!');
    res.end();
});

router.get('/getCounters', function (req, res) {
    Counter.find(function (err, data) {
        if (err) {
            console.log(err);
        } else {
            res.json({ data: data });
            res.end();
        }

    })
});
//Product.collection.drop();
router.post('/postProduct', function (req, res) {
    const pi = req.body;
    if (pi.name && pi.brand && pi.price && pi.description) {
        const product = new Product({
            Name: pi.name,
            Brand: pi.brand,
            Price: pi.price,
            Barcode: pi.barcode,
            Details: pi.description,
            Quantity: pi.quantity,
        });
        product.save(function (err, msg) {
            if (err) {
                console.log(err);
                res.json({ status: false, msg: err });
                res.end();
            } else {
                res.json({ status: true, msg: msg });
                res.end();
            }
        });
    } else {
        res.json({ status: false, data: 'Data missing' });
        res.end();
    }
});

router.post('/getProduct', function (req, res) {
    const pi = req.body;
    if (pi.barcode) {
        Product.findOne({ Barcode: pi.barcode }, function (err, data) {
            if (err) {
                res.json({ status: flase, error: err });
                res.end();
                console.log(err);
            } else {
                res.json({ status: true, data: data });
                res.end();
            }
        })
    } else {
        res.json({ status: false, error: 'Wrong barcode' });
        res.end();
    }
})

router.get('/getAllProducts', function (req, res) {
    Product.find(function (err, data) {
        if (err) {
            console.log(err);
            res.json({ status: false, data: err });
            res.end();
        } else {
            res.json({ status: true, data: data });
            res.end();
        }
    })
});

router.post('/postCounter', function (req, res) {
    const cid = req.body;
    if (!cid.id) {
        res.json({ status: false });
        res.end();
    } else {
        Counter.update({ _id: cid.id, engaged: false }, { engaged: true }, function (err, updatedNum) {
            if (err) {
                res.json({ err: err });
                res.end();
            }
            else {
                if (updatedNum['n'] <= 0) {
                    res.json({ status: false });
                    res.end();
                } else {
                    const newSession = new CounterSession({
                        counterID: cid.id,
                    });
                    newSession.save(function (err, data) {
                        if (err) {
                            res.json({ status: false, err: err });
                            res.end();
                        } else {
                            res.json({ updateNum: updatedNum, status: true, sessionID: data });
                            res.end();
                        }
                    });
                }
            }
        })
    }
});

router.post('/logOff', function (req, res) {
    const sid = req.body.id;
    if (!sid) {
        res.json({ status: false });
        res.end();
    } else {
        CounterSession.find({ _id: sid }, function (err, data) {
            if (err) {
                res.json({ status: false, err: err });
            } else {
                Counter.update({ _id: data[0].counterID }, { engaged: false }, function (err, data) {
                    if (err) {
                        res.json({ status: false, err: err });
                    } else {
                        CounterSession.deleteOne({ _id: sid }, function (err, data) {
                            if (err) {
                                res.json({ status: false, err: err });
                                res.end();
                            } else {
                                res.json({ status: true });
                                res.end();
                            }
                        });
                    }
                })
            }
        })
    }
});

router.post('/postTest', function (req, res) {
    res.json({ id: '' });
    res.end();
});
//Customer.collection.drop();
router.post('/postCustomer', function (req, res) {
    const user = req.body;
    if (user.name && user.email && user.phone) {
        Customer.find({ email: user.email }, function (err, data) {
            if (err) {
                res.json({ status: false, error: err });
                res.end();
            } else {
                if (data.length > 0) {
                    res.json({ status: true, session: data[0]._id });
                    res.end();
                } else {
                    const newCustomer = new Customer({
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        productIDS: ''
                    });
                    newCustomer.save(function (err, data) {
                        if (err) {
                            res.json({ status: false, msg: 'Something went wrong.' });
                            res.end();
                        } else {
                            res.json({ status: true, session: data._id });
                            res.end();
                        }
                    });
                }
            }
        });
    } else {
        res.json({ status: false, msg: 'All fields are required.' });
        res.end();
    }
});

router.post("/logout", function (req, res) {
    const customerID = req.body.customerID;
    if (customerID) {
        Customer.deleteOne({ _id: customerID }, function (err, data) {
            if (err) {
                res.json({ status: false, error: err });
                console.log(err);
                res.end();
            } else {
                res.json({ status: true });
                res.end();
                console.log(data);
            }
        })
    }
});

router.post('/addToCart', function (req, res) {
    const itemID = req.body.barcode;
    const customerID = req.body.customerID;
    if (itemID && customerID) {
        Customer.findOne({ _id: customerID }, function (err, data) {
            if (err) {
                res.json({ status: false, error: err });
                res.end();
            } else {
                var arr = data.itemIDS;
                arr.push(itemID);
                data.save();
                console.log(data);
                res.json({ status: true, data: data });
                res.end();
            }
        });
    }
});

router.post('/getCustomer', function (req, res) {
    const counterID = req.body.id;
    if (counterID) {
        CustomerCounter.findOne(function (err, data) {
            if (err) {
                res.json({ status: false, err: err });
                res.end();
            } else {
                res.json({ status: true, data: data });
                res.end();
            }
        })

    } else {
        res.json({ status: false });
        res.end();
    }

});
router.post('/getCart', function (req, res) {
    const customerID = req.body.customerID;
    console.log(customerID);
    if (customerID) {
        Customer.findOne({ _id: customerID }, function (err, data) {
            if (err) {
                res.json({ status: false, error: err });
                res.end();
                console.log(err);
            } else {
                const barcodes = data['itemIDS'];
                console.log(barcodes);
                Product.find({ Barcode: { $in: barcodes } }, function (err, data) {
                    if (err) {
                        console.log(err);
                        res.json({ status: false, error: err });
                        res.end();
                    } else {
                        res.json({ status: true, data: data });
                        res.end();
                    }

                })

            }
        });
    } else {
        res.json({ status: false, error: 'Invalid request' });
        res.end();
    }
});

module.exports = router;
