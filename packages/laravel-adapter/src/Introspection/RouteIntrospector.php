<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Laravel\Introspection;

use Illuminate\Routing\Route;
use Illuminate\Routing\Router;

class RouteIntrospector
{
    protected Router $router;

    public function __construct(Router $router)
    {
        $this->router = $router;
    }

    /**
     * Get a formatted list of all registered application routes with middleware.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getRoutes(): array
    {
        $routes = [];

        /** @var Route $route */
        foreach ($this->router->getRoutes() as $route) {
            $routes[] = [
                'uri' => $route->uri(),
                'methods' => $route->methods(),
                'name' => $route->getName(),
                'action' => $route->getActionName(),
                'middleware' => $route->gatherMiddleware(),
            ];
        }

        return $routes;
    }
}
