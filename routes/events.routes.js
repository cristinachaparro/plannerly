const express = require("express");
const { isOrganiser, isLoggedIn } = require("../middlewares/auth-middlewares");
const router = express.Router();
const Event = require("../models/Event.model");
const User = require("../models/User.model");
const uploader = require("../middlewares/cloudinary");

// GET "events/all" => renderizar all-events.hbs con la lista de todos los eventos
router.get("/all", async (req, res, next) => {
  try {
    const allEvents = await Event.find();
    res.render("events/all-events.hbs", { allEvents });
  } catch (error) {
    next(error);
  }
});

// GET "events/:id/details" => renderizar event.hbs con tarjeta de un solo evento
router.get("/:id/details", async (req, res, next) => {
  try {
    const singleEvent = await Event.findById(req.params.id).populate(
      "creator",
      "username"
    );

    if (
      req.session.activeUser._id.toString() ===
      singleEvent.creator._id.toString()
    ) {
      singleEvent.isMyEvent = true;
    } else {
      singleEvent.isMyEvent = false;
    }

    const attendingUsers = await User.find({
      attendedEvents: { _id: req.params.id },
    }).select();

    const usersGoing = singleEvent.slots - attendingUsers.length;

    if (attendingUsers.length === singleEvent.slots) {
      singleEvent.isFull = true;
    } else {
      singleEvent.isFull = false;
    }
    
    res.render("events/event.hbs", {
      singleEvent,
      attendingUsers,
      usersGoing,
    });
  } catch (error) {
    next(error);
  }
});

// GET "events/create" => renderizar create-form.hbs para crear evento < ORGANISER ONLY
router.get("/create", isLoggedIn, isOrganiser, (req, res, next) => {
  res.render("events/create-form.hbs");
});

// POST "events/create" => ruta para crear evento y redireccionar < ORGANISER ONLY
router.post(
  "/create",
  isLoggedIn,
  isOrganiser,
  uploader.single("image"),
  async (req, res, next) => {
    let image;
    if (req.file !== undefined) {
      image = req.file.path;
    }
    try {
      const { name, price, date, location, description, slots } = req.body;

      await Event.create({
        name,
        price,
        date,
        location,
        slots,
        description,
        creator: req.session.activeUser._id,
        image,
      });
      res.redirect("/events/all");
    } catch (error) {
      next(error);
    }
  }
);

// GET "events/:id/edit" => renderizar edit-form.hbs para editar evento > ORGANISER ONLY !!!! DELETE USER FROM ATTENDANT PENDING
router.get("/:id/edit", isLoggedIn, isOrganiser, async (req, res, next) => {
  try {
    const eventToEdit = await Event.findByIdAndUpdate(req.params.id, req.body);
    res.render("events/edit-form.hbs", eventToEdit);
  } catch (error) {
    next(error);
  }
});

// POST "events/:id/edit" => ruta para editar info de evento y rediceccionar < ORGANISER ONLY
router.post(
  "/:id/edit",
  isLoggedIn,
  isOrganiser,
  uploader.single("image"),
  async (req, res, next) => {
    try {
      await Event.findByIdAndUpdate(req.params.id, req.body);
      res.redirect(`/events/${req.params.id}/details`);
    } catch (error) {
      next(error);
    }
  }
);

// POST "events/:id/delete" => ruta para borrar evento y redireccionar < ORGANISER ONLY
router.post("/:id/delete", isLoggedIn, isOrganiser, async (req, res, next) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.redirect("/events/all");
  } catch (error) {
    next(error);
  }
});

//POST "events/:id/fav"
router.post("/:id/fav", async (req, res, next) => {
  try {
    const favEvent = await Event.findById(req.params.id);
    await User.findByIdAndUpdate(req.session.activeUser, {
      $push: { favouriteEvents: favEvent },
    });
    res.redirect(`/events/${req.params.id}/details`);
  } catch (error) {
    next(error);
  }
});

//POST "events/:id/attend"
router.post("/:id/attend", async (req, res, next) => {
  try {
    const attendEvent = await Event.findById(req.params.id);
    await User.findByIdAndUpdate(req.session.activeUser, {
      $push: { attendedEvents: attendEvent },
    });
    res.redirect(`/events/${req.params.id}/details`);
  } catch (error) {
    next(error);
  }
});

//POST "events/:id/kick-user"
router.post("/:id/kick-user/:userId", async (req, res, next) => {
  try {
    // const event = Event.findById(req.params.id);
    await User.findByIdAndUpdate(req.params.userId, {
      $pullAll: { attendedEvents: [req.params.id] },
    });
    res.redirect(`/events/${req.params.id}/details`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
