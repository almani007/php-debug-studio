package main

import (
	"net/url"
	"strings"
)

type PathMapper struct {
	RemotePrefix string
	LocalPrefix  string
}

func NewPathMapper(remotePrefix, localPrefix string) *PathMapper {
	return &PathMapper{
		RemotePrefix: strings.TrimRight(remotePrefix, "/"),
		LocalPrefix:  strings.TrimRight(localPrefix, "/"),
	}
}

// RemoteUriToLocalPath converts a DBGp file URI to a local filesystem path
func (pm *PathMapper) RemoteUriToLocalPath(remoteURI string) string {
	u, err := url.Parse(remoteURI)
	var remotePath string
	if err == nil && u.Scheme == "file" {
		remotePath = u.Path
	} else {
		remotePath = strings.TrimPrefix(remoteURI, "file://")
	}

	if pm.RemotePrefix != "" && strings.HasPrefix(remotePath, pm.RemotePrefix) {
		rel := strings.TrimPrefix(remotePath, pm.RemotePrefix)
		return pm.LocalPrefix + rel
	}
	return remotePath
}

// LocalPathToRemoteUri converts a host path back to a container DBGp URI
func (pm *PathMapper) LocalPathToRemoteUri(localPath string) string {
	normalized := localPath
	if pm.LocalPrefix != "" && strings.HasPrefix(normalized, pm.LocalPrefix) {
		rel := strings.TrimPrefix(normalized, pm.LocalPrefix)
		remotePath := pm.RemotePrefix + rel
		return "file://" + remotePath
	}
	return "file://" + localPath
}
