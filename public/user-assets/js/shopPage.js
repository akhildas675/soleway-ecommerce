   // Enhanced Search Function
        function handleSearch(event) {
            event.preventDefault();
            
            const searchInput = document.getElementById('searchInput').value.trim();
            const urlParams = new URLSearchParams(window.location.search);
            
            let url = '/Shop?';
            const params = [];
            
            // Preserve existing filters
            const categoryId = urlParams.get('categoryId') || urlParams.get('category');
            if (categoryId) {
                params.push(`category=${categoryId}`);
            }
            
            const sort = urlParams.get('sort');
            if (sort) {
                params.push(`sort=${sort}`);
            }
            
            // Add search term
            if (searchInput) {
                params.push(`search=${encodeURIComponent(searchInput)}`);
            }
            
            url += params.join('&');
            window.location.href = url;
        }

        // Enhanced Wishlist Toggle
        function toggleWishList(productId) {
            fetch('/toggleWishlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productId: productId })
            })
            .then(response => response.json())
            .then(data => {
                const button = document.querySelector(`.js-addwish-b2[data-product-id="${productId}"]`);
                const icon = button ? button.querySelector('i') : null;

                if (data.success) {
                    if (data.action === 'added') {
                        if (button && icon) {
                            button.classList.add('active');
                            icon.classList.remove('bi-heart');
                            icon.classList.add('bi-heart-fill');
                        }
                    } else {
                        if (button && icon) {
                            button.classList.remove('active');
                            icon.classList.remove('bi-heart-fill');
                            icon.classList.add('bi-heart');
                        }
                    }
                    // Update wishlist count in header
                    const wishlistIcons = document.querySelectorAll('.icon-header-noti[data-notify]');
                    wishlistIcons.forEach(icon => {
                        if (icon.getAttribute('href') === '/Wishlist') {
                            const newCount = data.wishlistCount || 0;
                            icon.setAttribute('data-notify', newCount);
                        }
                    });
                } else {
                    console.error('Failed to update wishlist:', data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }

        // Initialize components
        $(document).ready(function() {
            // Select2 initialization
            $(".js-select2").each(function() {
                $(this).select2({
                    minimumResultsForSearch: 20,
                    dropdownParent: $(this).next('.dropDownSelect2')
                });
            });

            // Parallax initialization
            $('.parallax100').parallax100();

            // Gallery lightbox
            $('.gallery-lb').each(function() {
                $(this).magnificPopup({
                    delegate: 'a',
                    type: 'image',
                    gallery: {
                        enabled: true
                    },
                    mainClass: 'mfp-fade'
                });
            });

            // Perfect scrollbar
            $('.js-pscroll').each(function() {
                $(this).css('position', 'relative');
                $(this).css('overflow', 'hidden');
                var ps = new PerfectScrollbar(this, {
                    wheelSpeed: 1,
                    scrollingThreshold: 1000,
                    wheelPropagation: false,
                });

                $(window).on('resize', function() {
                    ps.update();
                });
            });
        });