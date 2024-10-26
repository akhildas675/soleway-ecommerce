const Category = require("../../Model/categoryModel");

const categoryPage = async (req, res) => {
  try {
    const categoryData = await Category.find();
    //to show the category list
    res.render("categories", { category: categoryData });
  } catch (error) {
    console.log(error);
  }
};

const categoryAdding = async (req, res) => {
  try {
    // console.log(req.body.categoryName, req.body.description);
    const { categoryName, description } = req.body;
    const checkCategory = categoryName.trim();
    // console.log(checkCategory);

    const categoryExisting = await Category.findOne({
      categoryName: { $regex: new RegExp("^" + checkCategory + "$", "i") },
    });

    if (categoryExisting) {
      res.redirect("/admin/categoryAdd?error=exists");
    } else {
      const newCategory = new Category({
        categoryName: categoryName,
        description: description,
      });

      await newCategory.save();
      res.redirect("/admin/categoryAdd?success=true");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
};

const categoryBlocking = async (req, res) => {
  try {
    // console.log('this is the block id')
    const categoryId = req.query.id;
    // console.log(categoryId,'this is the block id')
    const categoryBlock = await Category.findByIdAndUpdate(categoryId, {
      is_active: false,
    });
    // console.log(categoryBlock,"working category block");
    res.redirect("/admin/categoryAdd");
  } catch (error) {
    console.log(error.message);
  }
};

const categoryUnblocking = async (req, res) => {
  try {
    const categoryId = req.query.id;
    // console.log(categoryId)
    const categoryUnBlock = await Category.findByIdAndUpdate(categoryId, {
      is_active: true,
    });
    // console.log(categoryUnBlock);
    res.redirect("/admin/categoryAdd");
  } catch (error) {
    console.log(error.message);
  }
};

const editCategory = async (req, res) => {
  try {
    const categories = await Category.findById(req.query.id);
    req.session.categoryId = req.query.id;
    res.render("editCategory", { category: categories });
  } catch (error) {
    console.log(error);
  }
};

const editingCategory = async (req, res) => {
  try {
    const { categoryName, description } = req.body;
    // console.log(req.body)
    const categoryData = await Category.find();
    let checkCategory = categoryName.trim();
    // console.log(checkCategory);

    const categoryExisting = await Category.findOne({
      _id: { $ne: req.session.categoryId },
      categoryName: { $regex: new RegExp("^" + checkCategory + "$", "i") },
    });

    if (categoryExisting) {
      console.log(categoryData);
      res.redirect("/admin/categoryAdd?error=exists");
    } else {
      const updated = await Category.findByIdAndUpdate(
        { _id: req.session.categoryId },
        { $set: { categoryName, description } }
      );
      console.log(updated, "updated");

      res.redirect("/admin/categoryAdd?success=true");
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  categoryPage,
  categoryAdding,
  editCategory,
  categoryBlocking,
  categoryUnblocking,
  editingCategory,
};
