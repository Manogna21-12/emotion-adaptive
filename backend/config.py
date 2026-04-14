"""
Optional Cloudinary configuration.

The backend currently imports this module during startup. If `cloudinary` is not
installed, we still want auth routes (login/signup) to work.
"""

try:
    import cloudinary

    cloudinary.config(
        cloud_name="dba4oih2b",
        api_key="736584243454974",
        api_secret="Hw1MjQuM84b2OTEagdkh3wW1fJQ",
    )
except ModuleNotFoundError:
    # Cloudinary is only needed for media upload/processing features.
    # Auth endpoints should remain functional without it.
    pass