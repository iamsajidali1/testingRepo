class CustomAuthorizationHeader:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # use X-Authorization to provide Authorization header
        # if some "intelligent" tool decides to strip it for their auth
        request.META["HTTP_AUTHORIZATION"] = request.META.get(
            "HTTP_X_AUTHORIZATION", request.META.get("HTTP_AUTHORIZATION", b"")
        )
        response = self.get_response(request)
        return response
