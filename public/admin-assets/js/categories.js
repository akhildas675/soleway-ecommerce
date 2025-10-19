let editingCategoryId = null;

function resetForm() {
  document.getElementById("category-id").value = "";
  document.getElementById("categoryForm").reset();
  document.getElementById("submitBtn").textContent = "Create category";
  document.getElementById("cancelBtn").style.display = "none";
  document.getElementById("categoryNameError").textContent = "";
  document.getElementById("descriptionError").textContent = "";
  editingCategoryId = null;
}

document.addEventListener("DOMContentLoaded", () => {
  // FORM SUBMISSION (CREATE OR UPDATE)
  document
    .getElementById("categoryForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const categoryId = document.getElementById("category-id").value;
      const data = {
        categoryName: form.categoryName.value.trim(),
        description: form.description.value.trim(),
      };

      try {
        let endpoint, method;

        if (categoryId) {
          // Update mode
          endpoint = `/admin/category/${categoryId}`;
          method = "PUT";
        } else {
          // Add mode
          endpoint = "/admin/category";
          method = "POST";
        }

        const res = await fetch(endpoint, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (result.success) {
          if (categoryId) {
            // Update existing row
            const tr = document.querySelector(`tr[data-id="${categoryId}"]`);
            tr.querySelector(".cat-name").textContent =
              result.category.categoryName;
            tr.querySelector(".cat-desc").textContent =
              result.category.description.substring(0, 40);
            tr.setAttribute("data-name", result.category.categoryName);
            tr.setAttribute("data-desc", result.category.description);

            Toastify({
              text: "Category updated successfully!",
              duration: 2000,
              gravity: "top",
              position: "right",
              backgroundColor: "#4CAF50",
            }).showToast();
          } else {
            // Add new row
            const tbody = document.getElementById("categoryTableBody");
            const row = document.createElement("tr");
            row.dataset.id = result.category._id;
            row.dataset.name = result.category.categoryName;
            row.dataset.desc = result.category.description;
            row.innerHTML = `
                  <td>New</td>
                  <td class="cat-name">${result.category.categoryName}</td>
                  <td class="cat-desc">${result.category.description.substring(
                    0,
                    40
                  )}</td>
                  <td class="cat-status">${
                    result.category.is_active ? "Active" : "Inactive"
                  }</td>
                  <td class="text-end">
                    <button type="button" class="btn btn-sm btn-info editBtn">Edit</button>
                    <button type="button" class="btn btn-sm toggleBtn ${
                      result.category.is_active ? "btnBlock" : "btnUnblock"
                    }" data-active="${result.category.is_active}">
                      ${result.category.is_active ? "Block" : "Unblock"}
                    </button>
                    <button type="button" class="btn btn-sm btn-danger deleteBtn">Delete</button>
                  </td>`;
            tbody.prepend(row);

            Toastify({
              text: "Category added successfully!",
              duration: 2000,
              gravity: "top",
              position: "right",
              backgroundColor: "#4CAF50",
            }).showToast();
          }
          resetForm();
        } else {
          Toastify({
            text: result.message || "Error occurred",
            duration: 2000,
            gravity: "top",
            position: "right",
            backgroundColor: "#f44336",
          }).showToast();
        }
      } catch (error) {
        console.error("Error:", error);
        Swal.fire("Error", "Something went wrong", "error");
      }
    });

  // Cancel button
  document.getElementById("cancelBtn").addEventListener("click", resetForm);

  // TABLE EVENT HANDLER (EDIT / DELETE / TOGGLE)
  document
    .getElementById("categoryTableBody")
    .addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      const id = tr.dataset.id;

      // DELETE CATEGORY
      if (e.target.classList.contains("deleteBtn")) {
        const { isConfirmed } = await Swal.fire({
          title: "Are you sure?",
          text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Yes, delete it!",
        });

        if (isConfirmed) {
          const res = await fetch(`/admin/category/${id}`, {
            method: "DELETE",
          });
          const result = await res.json();
          if (result.success) {
            tr.remove();
            if (document.getElementById("category-id").value === id) {
              resetForm();
            }
            Toastify({
              text: "Category deleted successfully!",
              duration: 2000,
              gravity: "top",
              position: "right",
              backgroundColor: "#4CAF50",
            }).showToast();
          }
        }
      }

      // TOGGLE STATUS (BLOCK/UNBLOCK)
      if (e.target.classList.contains("toggleBtn")) {
        const current = e.target.dataset.active === "true";
        const res = await fetch(`/admin/category/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !current }),
        });
        const result = await res.json();

        if (result.success) {
          const newStatus = !current ? "Active" : "Inactive";
          const statusElement = tr.querySelector(".cat-status");
          statusElement.textContent = newStatus;
          statusElement.classList.toggle("alert-success", !current);
          statusElement.classList.toggle("alert-danger", current);
          e.target.textContent = !current ? "Block" : "Unblock";
          e.target.dataset.active = (!current).toString();

          e.target.classList.toggle("btnBlock", !current);
          e.target.classList.toggle("btnUnblock", current);

          Toastify({
            text: !current ? "Category blocked!" : "Category unblocked!",
            duration: 2000,
            gravity: "top",
            position: "right",
            backgroundColor: "#4CAF50",
          }).showToast();
        }
      }

      // EDIT CATEGORY
      if (e.target.classList.contains("editBtn")) {
        const categoryId = tr.dataset.id;
        const categoryName = tr.dataset.name;
        const description = tr.dataset.desc;

        // Populate form with category data
        document.getElementById("category-id").value = categoryId;
        document.getElementById("category_name").value = categoryName;
        document.getElementById("description").value = description;

        // Update button labels
        document.getElementById("submitBtn").textContent = "Update category";
        document.getElementById("cancelBtn").style.display = "block";

        // Scroll to form
        document
          .getElementById("categoryForm")
          .scrollIntoView({ behavior: "smooth" });
      }
    });
});
